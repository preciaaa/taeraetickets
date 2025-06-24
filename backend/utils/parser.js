function parseTicketText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    const fields = {};

    for (const line of lines) {
        const [key, ...valueParts] = line.split(':');
        if (valueParts.length === 0) continue;

        const fieldName = key.trim().toLowerCase().replace(/\s+/g, '_');
        const fieldValue = valueParts.join(':').trim();
        if (fieldName && fieldValue) {
            fields[fieldName] = fieldValue;
        }
    }

    return fields;
}

module.exports = { parseTicketText };