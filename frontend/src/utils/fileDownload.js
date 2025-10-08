export const sanitizeFilename = (value = "") => {
  if (!value) return "book";
  return (
    value
      .toString()
      .trim()
      .replace(/[^a-z0-9\-_.]/gi, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 120) || "book"
  );
};

export const downloadFileFromUrl = async (url, filename = "book.pdf") => {
  if (!url) {
    throw new Error("File URL is required");
  }

  const safeName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;

  const response = await fetch(url, {
    credentials: "omit",
    mode: "cors",
  });

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`);
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);

  try {
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = safeName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    window.URL.revokeObjectURL(blobUrl);
  }
};
