import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Mail, Send, Inbox, Loader2, FileX, RefreshCw,
  Users, Layers, Sparkles, Building2, Calendar
} from "lucide-react"
import type { TslSummary } from "../../../api/tender_supplier_lots"
import type { EmailCheckRange } from "../../../api/emails"
import { useEmailPreview, useSendEmail, useCheckEmails } from "../../../hooks/useEmails"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import Modal from "../../ui/Modal"
import { History } from "lucide-react"
import StatusBadge from "../../ui/StatusBadge"

interface Props {
  emailsResponse: { tender_id: number; total: number; items: TslSummary[] } | null | undefined
  tenderId: number
}

const TSL_STATUS_ATTENTE = 1
const TSL_STATUS_ENVOYE = 2
const TSL_STATUS_REPONSE = 3
const TSL_STATUS_ERREUR_ENVOI = 4
const TSL_STATUS_ERREUR_REC = 5

// Couleurs pour les statuts des tableaux
const TABLE_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Prêts à envoyer": { bg: "from-sky-50 to-blue-50", text: "text-sky-700", border: "border-sky-200" },
  "En attente de PDF": { bg: "from-slate-50 to-slate-100", text: "text-slate-600", border: "border-slate-200" },
  "Emails envoyés": { bg: "from-blue-50 to-indigo-50", text: "text-blue-700", border: "border-blue-200" },
  "Réponses reçues": { bg: "from-emerald-50 to-teal-50", text: "text-emerald-700", border: "border-emerald-200" },
  "Erreurs d'envoi": { bg: "from-rose-50 to-red-50", text: "text-rose-700", border: "border-rose-200" },
  "Erreurs de réception (pièce jointe invalide)": { bg: "from-amber-50 to-orange-50", text: "text-amber-700", border: "border-amber-200" },
}

function EmailTable({
  items, title, mode, onAction, actionLabel, onHistory, sendDisabled,
}: {
  items: TslSummary[]
  title: string
  mode: "send" | "history"
  onAction?: (tsl: TslSummary) => void
  actionLabel?: string
  onHistory: (tsl: TslSummary) => void
  sendDisabled?: (tsl: TslSummary) => boolean
}) {
  if (!items.length) return null
  
  const colors = TABLE_STATUS_COLORS[title] || TABLE_STATUS_COLORS["Prêts à envoyer"]
  
  return (
    <div className={`bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all`}>
      {/* En-tête coloré */}
      <div className={`px-4 py-2.5 bg-gradient-to-r ${colors.bg} backdrop-blur-sm border-b ${colors.border}`}>
        <p className={`text-xs font-semibold ${colors.text}`}>{title} ({items.length})</p>
      </div>
      
      {/* Conteneur avec scroll horizontal */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-white/60 bg-white/30">
              {["Fournisseur", "Email", "Lot", "Statut", "Date envoi", "Actions"].map((h) => (
                <th key={h} className={`px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap ${h === "Actions" ? "text-right" : "text-left"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/60">
            {items.map((tsl, index) => (
              <motion.tr
                key={tsl.tsl_id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.02, 0.3) }}
                className="hover:bg-white/50 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Building2 size={12} className="text-slate-400" />
                    {tsl.supplier_name}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Mail size={10} className="text-slate-400" />
                    {tsl.supplier_email || "—"}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-xs bg-sky-50/80 text-sky-600 px-2 py-0.5 rounded-md font-medium whitespace-nowrap flex items-center gap-1">
                    <Layers size={10} />
                    {tsl.lot_name}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={tsl.status_name} />
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Calendar size={10} className="text-slate-400" />
                    {fmt(tsl.email_sent_at)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                    {mode === "history" ? (
                      <button
                        onClick={() => onHistory(tsl)}
                        className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50/80 hover:bg-indigo-100/80 rounded-lg border border-indigo-200/60 transition-all flex items-center gap-1.5"
                        title="Voir l'historique des échanges"
                      >
                        <History size={13} /> Voir l'historique
                      </button>
                    ) : (
                      onAction && (
                        <button
                          onClick={() => onAction(tsl)}
                          disabled={sendDisabled?.(tsl)}
                          title={sendDisabled?.(tsl) ? "PDF manquant — générez-le dans l'onglet PDFs" : undefined}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 rounded-lg transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send size={12} /> {actionLabel}
                        </button>
                      )
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const fmt = (d: string | null | undefined) => {
  if (!d) return "—"
  const date = new Date(d)
  return Number.isNaN(date.getTime()) ? "—" : format(date, "dd MMMM yyyy à HH:mm", { locale: fr })
}

const RANGE_OPTIONS: { value: EmailCheckRange; label: string }[] = [
  { value: "today", label: "Aujourd'hui" },
  { value: "last_2_days", label: "2 derniers jours" },
  { value: "last_7_days", label: "7 derniers jours" },
  { value: "all", label: "Tous les non lus" },
]

export default function TabEmails({ emailsResponse, tenderId }: Props) {
  const navigate = useNavigate()
  const { id: tenderIdParam } = useParams<{ id: string }>()
  const { mutate: checkEmails, isPending: checking } = useCheckEmails(tenderId)
  const [range, setRange] = useState<EmailCheckRange>("last_2_days")
  const [sendTarget, setSendTarget] = useState<TslSummary | null>(null)

  if (!emailsResponse) return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-12 text-center max-w-4xl mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-center justify-center mx-auto mb-4">
        <Mail size={28} className="text-slate-300" />
      </div>
      <p className="text-sm font-medium text-slate-600">Aucune donnée email disponible</p>
      <p className="text-xs text-slate-400 mt-1">Les emails apparaîtront ici une fois les consultations envoyées</p>
    </div>
  )

  const items = emailsResponse.items
  const total = emailsResponse.total

  const prets = items.filter((i) => (i.status_id ?? TSL_STATUS_ATTENTE) === TSL_STATUS_ATTENTE && i.pdf_exists)
  const enAttentePdf = items.filter((i) => (i.status_id ?? TSL_STATUS_ATTENTE) === TSL_STATUS_ATTENTE && !i.pdf_exists)
  const envoyes = items.filter((i) => i.status_id === TSL_STATUS_ENVOYE)
  const reponses = items.filter((i) => i.status_id === TSL_STATUS_REPONSE)
  const erreursEnvoi = items.filter((i) => i.status_id === TSL_STATUS_ERREUR_ENVOI)
  const erreursReception = items.filter((i) => i.status_id === TSL_STATUS_ERREUR_REC)
  const handleHistory = (tsl: TslSummary) => navigate(`/tenders/${tenderIdParam}/emails/${tsl.tsl_id}`)

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
        {/* Header avec statistiques */}
        <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-300/30 border border-white/60 overflow-hidden">
          <div className="px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 flex items-center justify-center">
                  <Mail size={16} className="text-violet-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Suivi des consultations envoyées</p>
                  <p className="text-xs text-slate-400">{total} association(s) au total</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex gap-1 bg-white/50 backdrop-blur-sm border border-white/50 rounded-lg p-1 overflow-x-auto max-w-full">
                  {RANGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setRange(opt.value)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap ${
                        range === opt.value ? "bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-md" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => checkEmails(range)} 
                  disabled={checking} 
                  className="px-3 py-1.5 text-xs font-medium text-sky-600 bg-sky-50/80 hover:bg-sky-100/80 rounded-xl border border-sky-200/60 transition-all flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                >
                  <RefreshCw size={13} className={checking ? "animate-spin" : ""} />
                  {checking ? "Vérification..." : "Récupérer les réponses"}
                </button>
              </div>
            </div>

            {/* Mini stats */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100/60">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Users size={12} className="text-slate-400" />
                <span>{total} association(s)</span>
              </div>
              <div className="w-px h-4 bg-slate-200" />
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Send size={11} className="text-sky-400" />
                <span>{envoyes.length} envoyé(s)</span>
              </div>
              <div className="w-px h-4 bg-slate-200" />
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Inbox size={11} className="text-emerald-400" />
                <span>{reponses.length} réponse(s)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Alerte PDF manquant */}
        {enAttentePdf.length > 0 && (
          <div className="bg-amber-50/70 backdrop-blur-xl border border-amber-100/70 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100/60 flex items-center justify-center flex-shrink-0">
              <FileX size={14} className="text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {enAttentePdf.length} fournisseur(s) en attente de génération PDF
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Générez le PDF du lot depuis l'onglet PDFs avant de pouvoir envoyer.
              </p>
            </div>
          </div>
        )}

        {/* État vide */}
        {total === 0 ? (
          <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-600">Aucun fournisseur assigné</p>
            <p className="text-xs text-slate-400 mt-1">Ajoutez des fournisseurs dans l'onglet Fournisseurs</p>
          </div>
        ) : (
          <div className="space-y-4">
            <EmailTable items={prets} title="Prêts à envoyer" mode="send" onAction={setSendTarget} actionLabel="Envoyer" onHistory={handleHistory} />
            <EmailTable items={enAttentePdf} title="En attente de PDF" mode="send" onAction={setSendTarget} actionLabel="Envoyer" sendDisabled={(t) => !t.pdf_exists} onHistory={handleHistory} />
            <EmailTable items={envoyes} title="Emails envoyés" mode="history" onHistory={handleHistory} />
            <EmailTable items={reponses} title="Réponses reçues" mode="history" onHistory={handleHistory} />
            <EmailTable items={erreursEnvoi} title="Erreurs d'envoi" mode="send" onAction={setSendTarget} actionLabel="Renvoyer" sendDisabled={(t) => !t.pdf_exists} onHistory={handleHistory} />
            <EmailTable items={erreursReception} title="Erreurs de réception (pièce jointe invalide)" mode="history" onHistory={handleHistory} />
          </div>
        )}
      </motion.div>

      <SendEmailModal target={sendTarget} tenderId={tenderId} onClose={() => setSendTarget(null)} />
    </>
  )
}

function SendEmailModal({
  target, tenderId, onClose,
}: {
  target: TslSummary | null
  tenderId: number
  onClose: () => void
}) {
  const { data: preview, isLoading } = useEmailPreview(target?.tsl_id ?? null)
  const { mutate: sendEmail, isPending: sending } = useSendEmail(tenderId)

  const [drafts, setDrafts] = useState<Record<number, { subject: string; body: string }>>({})

  if (!target) return null

  const draft = drafts[target.tsl_id]
  const subject = draft?.subject ?? preview?.subject ?? ""
  const body = draft?.body ?? preview?.body ?? ""

  const updateDraft = (updates: Partial<{ subject: string; body: string }>) => {
    setDrafts((current) => ({
      ...current,
      [target.tsl_id]: { subject, body, ...updates },
    }))
  }

  const handleSend = () => {
    sendEmail({ tslId: target.tsl_id, subject, body }, { onSuccess: () => onClose() })
  }

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title={`Email — ${target.supplier_name}`}
      subtitle={`Lot : ${target.lot_name}`}
      size="xl"
    >
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={22} className="animate-spin text-sky-500" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Mail size={16} className="text-sky-500" />
              Objet
              <span className="text-red-500 text-xs font-normal">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={16} className="text-sky-400" />
              </div>
              <input 
                value={subject} 
                onChange={(e) => updateDraft({ subject: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-sky-200 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-200 focus:bg-white transition-all outline-none shadow-sm" 
                placeholder="Objet de l'email..."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Sparkles size={16} className="text-indigo-500" />
              Message
              <span className="text-red-500 text-xs font-normal">*</span>
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3 pointer-events-none">
                <Sparkles size={16} className="text-indigo-400" />
              </div>
              <textarea
                value={body}
                onChange={(e) => updateDraft({ body: e.target.value })}
                rows={10}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-indigo-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:bg-white transition-all outline-none resize-none shadow-sm"
                placeholder="Rédigez votre message..."
              />
            </div>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50/80 border border-slate-200/60">
              <div className="w-6 h-6 rounded-lg bg-sky-100/60 flex items-center justify-center flex-shrink-0">
                <Sparkles size={12} className="text-sky-500" />
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                La référence de suivi et les documents (PDF technique du lot + document original de l'AO) seront ajoutés automatiquement à l'envoi.
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t-2 border-slate-100/80">
            <button 
              onClick={onClose} 
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100/80 hover:bg-slate-200/80 rounded-xl transition-all flex items-center gap-1.5"
            >
              Annuler
            </button>
            <button 
              onClick={handleSend} 
              disabled={sending || !subject || !body} 
              className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {sending ? (
                <><Loader2 size={14} className="animate-spin" /> Envoi...</>
              ) : (
                <><Send size={14} /> Envoyer</>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
