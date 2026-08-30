export async function openFileInNewTab(
  fetchBlob: () => Promise<Blob>,
  fallbackFilename: string
): Promise<void> {
  const newTab = window.open("", "_blank")

  try {
    const blob = await fetchBlob()
    const blobUrl = URL.createObjectURL(blob)

    if (newTab) {
      newTab.location.href = blobUrl
    } else {
      // Popup bloquée par le navigateur : fallback téléchargement direct
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = fallbackFilename
      a.click()
    }

    // Révocation différée pour laisser le temps à l'onglet de charger le blob
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
  } catch (e) {
    newTab?.close()
    throw e
  }
}