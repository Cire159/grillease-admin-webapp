export function normalizeOrderDoc(doc) {
  if (!doc) return doc;
  const normalized = { ...doc };
  // normalize status to consistent set: New, Processing, Completed, Cancelled
  if (doc.status) {
    const s = String(doc.status).toLowerCase();
    if (s === 'pending' || s === 'new') normalized.status = 'New';
    else if (s === 'processing' || s === 'preparing') normalized.status = 'Processing';
    else if (s === 'ready') normalized.status = 'Processing';
    else if (s === 'completed' || s === 'done') normalized.status = 'Completed';
    else if (s === 'cancelled' || s === 'canceled') normalized.status = 'Cancelled';
    else normalized.status = doc.status;
  }
  // ensure numeric total
  if (doc.total !== undefined) normalized.total = parseFloat(doc.total) || 0;
  return normalized;
}

export function normalizeReservationDoc(doc) {
  if (!doc) return doc;
  const normalized = { ...doc };
  if (doc.status) {
    const s = String(doc.status).toLowerCase();
    if (s === 'upcoming' || s === 'pending') normalized.status = 'Pending';
    else if (s === 'confirmed') normalized.status = 'Confirmed';
    else if (s === 'completed') normalized.status = 'Completed';
    else if (s === 'cancelled' || s === 'canceled') normalized.status = 'Cancelled';
    else normalized.status = doc.status;
  }
  // normalize guests/party_size
  normalized.party_size = parseInt(doc.party_size || doc.guests || 0, 10) || 0;
  return normalized;
}
