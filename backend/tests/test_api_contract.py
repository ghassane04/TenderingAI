from api.main import app


def test_openapi_contains_frontend_tender_and_supplier_routes():
    paths = app.openapi()["paths"]
    expected = {
        "/api/tenders",
        "/api/tenders/manual",
        "/api/tenders/initialize",
        "/api/tenders/{tender_id}/process",
        "/api/tenders/{tender_id}/metadata",
        "/api/suppliers",
        "/api/suppliers/{supplier_id}",
    }
    assert expected <= set(paths)


def test_health_and_documentation_routes_are_registered():
    paths = {path for route in app.routes if (path := getattr(route, "path", None))}
    assert "/" in paths
    assert "/docs" in paths
    assert "/openapi.json" in paths
