// Oturma süresi gibi süreleri Türkçe okunur biçime çevirir.
// Girdi saniye cinsindendir (acilisAt → kapanisAt farkı).

export const formatSure = (saniye: number): string => {
  const sn = Math.max(0, Math.round(saniye));
  if (sn < 60) return `${sn} sn`;
  const dk = Math.floor(sn / 60);
  if (dk < 60) return `${dk} dk`;
  const sa = Math.floor(dk / 60);
  const kalanDk = dk % 60;
  return kalanDk > 0 ? `${sa} sa ${kalanDk} dk` : `${sa} sa`;
};
