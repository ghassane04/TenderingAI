from fastapi import HTTPException
from typing import List

from database.tender_product_dao import get_tender_products_by_id
from database.supplier_product_dao import (
    get_supplier_products_by_tender, 
    get_supplier_product_by_id, 
    get_supplier_products_by_supplier_and_lot
)
from database.characteristics_dao import get_technical_characteristics_by_supplier_product
from database.requirement_dao import get_product_requirements_by_id
from schemas.comparison_info_schema import ( 
    SupplierProductComparisonResult,
    ComparisonLineResult, LotProductCoverage, 
    SupplierLotAggregateResult, LotSupplierRankingResponse,
    MatchedCharacteristic,ExtraCharacteristic
)
from database.tender_supplier_lots_dao import get_suppliers_by_tender_and_lot

CONFORMITE_MAP = {
    1: ("Conforme", "La valeur fournie respecte totalement l'exigence"),
    2: ("Non conforme", "La valeur fournie ne respecte pas l'exigence"),
    3: ("Non spécifié", "Aucune caractéristique correspondante trouvée pour cette exigence"),
}

async def build_supplier_product_comparison(conn, supplier_product_id: int) -> SupplierProductComparisonResult:
    sp = await get_supplier_product_by_id(conn, supplier_product_id)
    if not sp:
        raise HTTPException(status_code=404, detail="Produit fournisseur introuvable")

    product_id = sp.get("product_id")
    if not product_id:
        raise HTTPException(status_code=400, detail=f"Produit fournisseur {supplier_product_id} non encore confirmé")

    requirements = await get_product_requirements_by_id(conn, product_id)
    technicals = await get_technical_characteristics_by_supplier_product(conn, supplier_product_id)

    grouped: dict[int, list[dict]] = {}
    extra: list[dict] = []
    for t in technicals:
        req_id = t.get("requirement_id")
        (grouped.setdefault(req_id, []) if req_id else extra).append(t)

    lignes: List[ComparisonLineResult] = []
    nb_conformes = nb_non_conformes = nb_non_specifies = 0

    for req in requirements:
        matched = grouped.get(req["id"], [])
        if matched:
            s = matched[0].get("evaluation") or 3
            label, desc = CONFORMITE_MAP.get(s, CONFORMITE_MAP[3])
            lignes.append(ComparisonLineResult(
                requirement_id=req["id"], exigence=req["requirement"],
                valeur_requise=req.get("value"), operateur=req.get("operateur"),
                caracteristiques_fournies=[
                    MatchedCharacteristic(characteristic_id=m["id"], technical_data=m["technical_data"], value=m.get("value"))
                    for m in matched
                ],
                score=s, conformite=label, conformite_description=desc, is_non_couverte=False,
            ))
            if s == 1:
                nb_conformes += 1
            elif s == 2:
                nb_non_conformes += 1
            else:
                nb_non_specifies += 1
        else:
            label, desc = CONFORMITE_MAP[3]
            lignes.append(ComparisonLineResult(
                requirement_id=req["id"], exigence=req["requirement"],
                valeur_requise=req.get("value"), operateur=req.get("operateur"),
                caracteristiques_fournies=[], score=3, conformite=label, conformite_description=desc,
                is_non_couverte=True,
            ))
            nb_non_specifies += 1

    total_reqs = len(requirements)
    # Pas d'arrondi : on garde la précision maximale pour un classement exact.
    # L'affichage à 2 décimales est géré côté front (toFixed(2)).
    score = (nb_conformes / total_reqs) * 100 if total_reqs else 0.0

    return SupplierProductComparisonResult(
        supplier_product_id=supplier_product_id,
        supplier_product_designation=sp.get("designation", ""),
        tender_product_id=product_id,
        tender_product_designation=sp.get("tender_product_designation", ""),
        score=score,
        nb_conformes=nb_conformes, nb_non_conformes=nb_non_conformes, nb_non_specifies=nb_non_specifies,
        nb_exigences_total=total_reqs,
        lignes=lignes,
        caracteristiques_hors_exigences=[
            ExtraCharacteristic(characteristic_id=e["id"], technical_data=e["technical_data"], value=e.get("value"))
            for e in extra
        ],
    )


async def service_get_lot_ranking(conn, tender_id: int, lot_id: int) -> LotSupplierRankingResponse:
    all_tender_products = await get_tender_products_by_id(conn, tender_id)
    lot_products = [p for p in all_tender_products if p.get("technical_lot_id") == lot_id]
    if not lot_products:
        raise HTTPException(status_code=404, detail="Aucun produit dans ce lot")

    lot_name = lot_products[0].get("technical_lot_name") or f"Lot {lot_id}"
    total_products = len(lot_products)

    suppliers = await get_suppliers_by_tender_and_lot(conn, tender_id, lot_id)
    ranking: List[SupplierLotAggregateResult] = []

    for supplier in suppliers:
        sp_rows = await get_supplier_products_by_supplier_and_lot(conn, tender_id, supplier["supplier_id"], lot_id)

        best_by_tender_product: dict[int, tuple] = {}
        for sp in sp_rows:
            pid = sp.get("product_id")
            if not pid:
                continue
            try:
                comp = await build_supplier_product_comparison(conn, sp["id"])
            except HTTPException:
                continue
            current = best_by_tender_product.get(pid)
            if current is None or comp.score > current[0].score:
                best_by_tender_product[pid] = (comp, sp.get("supplier_datasheet_id"))

        lines: List[LotProductCoverage] = []
        scores: List[float] = []
        addressed = 0

        for tp in lot_products:
            entry = best_by_tender_product.get(tp["id"])
            if entry:
                comp, datasheet_id = entry
                lines.append(LotProductCoverage(
                    tender_product_id=tp["id"], tender_product_designation=tp["designation"],
                    supplier_product_id=comp.supplier_product_id, datasheet_id=datasheet_id,
                    score=comp.score, addressed=True,
                ))
                scores.append(comp.score)
                addressed += 1
            else:
                lines.append(LotProductCoverage(
                    tender_product_id=tp["id"], tender_product_designation=tp["designation"], addressed=False,
                ))
                scores.append(0.0)

        # Moyenne non arrondie : préserve la précision pour départager les fournisseurs.
        score_global = sum(scores) / total_products

        ranking.append(SupplierLotAggregateResult(
            supplier_id=supplier["supplier_id"], supplier_name=supplier["supplier_name"],
            nb_tender_products=total_products, nb_tender_products_addressed=addressed,
            score_global=score_global, products=lines,
        ))

    ranking.sort(key=lambda r: r.score_global, reverse=True)
    return LotSupplierRankingResponse(lot_id=lot_id, lot_name=lot_name, suppliers=ranking)

async def service_get_tender_lot_rankings(conn, tender_id: int) -> List[LotSupplierRankingResponse]:
    tender_products = await get_tender_products_by_id(conn, tender_id)
    lot_ids = sorted({p["technical_lot_id"] for p in tender_products if p.get("technical_lot_id")})

    results = []
    for lot_id in lot_ids:
        try:
            results.append(await service_get_lot_ranking(conn, tender_id, lot_id))
        except HTTPException:
            continue
    return results