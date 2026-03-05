/**
 * Utilitários para processamento de imagem no browser
 */
export const ImageUtils = {
    /**
     * Comprime uma imagem antes do upload
     * @param file Ficheiro original
     * @param maxWidth Largura máxima
     * @param quality Qualidade (0 a 1)
     */
    compressImage(file: File, maxWidth = 800, quality = 0.7): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = (maxWidth / width) * height;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) return reject(new Error('Canvas Context not found'));

                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                resolve(blob);
                            } else {
                                reject(new Error('Falha na compressão'));
                            }
                        },
                        'image/jpeg',
                        quality
                    );
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    }
};
