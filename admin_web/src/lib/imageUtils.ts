
/**
 * Compresse une image dans le navigateur via Canvas
 * @param file Le fichier d'origine (Blob/File)
 * @param maxWidth Largeur maximale (défaut: 1500px)
 * @param quality Qualité JPEG/WebP (0-1, défaut: 0.8)
 * @returns Blob compressé au format WebP
 */
export async function compressImage(file: File, maxWidth = 1500, quality = 0.8): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;

                // Calcul du ratio pour pas dépasser maxWidth
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxWidth) {
                        width *= maxWidth / height;
                        height = maxWidth;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    reject(new Error("Impossible d'obtenir le contexte 2D du canvas"));
                    return;
                }

                // Dessin de l'image redimensionnée
                ctx.drawImage(img, 0, 0, width, height);

                // Export en WebP (supporté par Chrome, Firefox, Safari moderne)
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error("Erreur lors de la conversion du canvas en blob"));
                        }
                    },
                    "image/webp",
                    quality
                );
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}
