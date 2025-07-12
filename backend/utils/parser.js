function parseTicketText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    
    const fields = {
        event_name: '',
        venue: '',
        event_date: '',
        section: '',
        row: '',
        seat: '',
        price: '',
        category: ''
    };

    // Extract event name (look for patterns like "TOUR" or artist names)
    const eventPatterns = [
        /(\d{4}\s+[A-Z\s]+(?:TOUR|CONCERT|SHOW|FESTIVAL)[A-Z\s]*)/i,
        /([A-Z\s]+(?:TOUR|CONCERT|SHOW|FESTIVAL)[A-Z\s]*)/i,
        /(\d{4}\s+[A-Z\s]+)/i
    ];
    
    for (const pattern of eventPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            fields.event_name = match[1].trim();
            break;
        }
    }

    // Extract venue
    const venuePatterns = [
        /([A-Z\s]+(?:STADIUM|ARENA|THEATRE|HALL|CENTER|CENTRE|CONVENTION|EXPO))/i,
        /([A-Z\s]+(?:INDOOR|OUTDOOR)\s+[A-Z\s]+)/i
    ];
    
    for (const pattern of venuePatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            fields.venue = match[1].trim();
            break;
        }
    }

    // Extract date
    const datePatterns = [
        /(\w{3}\s+\d{1,2}\s+\w{3}\s+\d{4},?\s+\d{1,2}:\d{2}(?:AM|PM)?)/i,
        /(\d{1,2}\/\d{1,2}\/\d{4})/,
        /(\d{4}-\d{2}-\d{2})/
    ];
    
    for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            fields.event_date = match[1].trim();
            break;
        }
    }

    // Extract section, row, seat
    const sectionPattern = /(?:SECTION|SEC)\s*:?\s*([A-Z0-9\s]+)/i;
    const rowPattern = /(?:ROW)\s*:?\s*([A-Z0-9\s]+)/i;
    const seatPattern = /(?:SEAT|SEAT\s+NUMBER)\s*:?\s*([A-Z0-9\s]+)/i;
    
    const sectionMatch = text.match(sectionPattern);
    const rowMatch = text.match(rowPattern);
    const seatMatch = text.match(seatPattern);
    
    if (sectionMatch) fields.section = sectionMatch[1].trim();
    if (rowMatch) fields.row = rowMatch[1].trim();
    if (seatMatch) fields.seat = seatMatch[1].trim();

    // Extract price
    const pricePattern = /\$(\d+(?:\.\d{2})?)/;
    const priceMatch = text.match(pricePattern);
    if (priceMatch) fields.price = priceMatch[1];

    // Determine category based on ticket type
    if (text.toLowerCase().includes('vip') || text.toLowerCase().includes('premium')) {
        fields.category = 'VIP';
    } else if (text.toLowerCase().includes('standing') || text.toLowerCase().includes('general admission')) {
        fields.category = 'General Admission';
    } else if (fields.section && fields.row && fields.seat) {
        fields.category = 'Seated';
    } else {
        fields.category = 'General';
    }

    return fields;
}

module.exports = { parseTicketText };