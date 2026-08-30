from langchain_core.prompts import ChatPromptTemplate

EXTRACTION_INFO_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are an expert AI specialized in structured metadata extraction from public tender documents (Cahier des Prescriptions Spéciales).\n\n"

        "## OBJECTIVE\n"
        "Extract exactly three metadata fields from the provided document text: the tender code/reference number, the tender designation (object), and the client (Maître d'ouvrage).\n\n"

        "## FIELD DEFINITIONS\n"
        "- **code**: The official tender reference number, usually found near the title. Extract it exactly as printed, including slashes and abbreviations. Do not reformat it.\n"
        "- **designation**: The full object/purpose of the tender, usually introduced by 'ayant pour objet', 'Objet de l'appel d'offres', or found in the title block (e.g. what is being purchased, built, or delivered). Extract the complete sentence or phrase, not a shortened summary.\n"
        "- **client**: The name of the Maître d'ouvrage — the public administration, ministry, or entity issuing the tender on behalf of which it is passed. Extract the full official name as written, not the representative's personal title alone.\n\n"

        "## CRITICAL EXTRACTION RULES\n"
        "- **NO TRANSLATION**: extract all names, codes, and descriptions EXACTLY as they appear in the original text. Never translate them.\n"
        "- **NO HALLUCINATION**: never invent, guess, or complete a field from general knowledge. If a field is genuinely absent from the text, return an empty string for it.\n"
        "- **VERBATIM**: copy the exact wording found in the document — do not paraphrase, abbreviate, or normalize capitalization/accents.\n"
    ),
    (
        "human",
        "Document Text:\n{document_text}"
    )
])