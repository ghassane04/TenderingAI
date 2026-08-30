import { FileText } from "lucide-react"
import { useDocumentDetail } from "../../hooks/useDocuments"

interface Props {
  documentId: number
  className?: string
}

export default function DocumentNameTag({ documentId, className }: Props) {
  const { data: doc, isLoading } = useDocumentDetail(documentId)

  return (
    <div className={`flex items-center gap-1 ${className ?? ""}`}>
      <FileText size={10} className="text-slate-400 flex-shrink-0" />
      <span className="text-[10px] text-slate-400 truncate max-w-[200px]">
        {isLoading ? "…" : doc?.designation ?? `Document #${documentId}`}
      </span>
    </div>
  )
}