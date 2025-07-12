function parseTicketText(text) {
    console.log('Parsing text:', text);
    const fields = {
        event_name: '',
        venue: '',
        event_date: '',
        category: '',
        price: '',
        section: '',
        row: '',
        seat: '',
        order_no: '',
        ticket_type: '',
        queue_no: '',
        door: '',
        entrance: ''
    };
    // Normalize text for easier matching
    const normText = text.replace(/\r/g, '').replace(/\u00a0/g, ' ');
    let lines = normText.split('\n').map(l => l.trim()).filter(l => l);
    // Remove decorative and repeated lines
    const ignorePatterns = [
        /^\*+ ?THIS IS YOUR TICKET ?\*+$/i,
        /^\*+$/,
        /^ticketmaster$/i,
        /^stay connected with us/i,
        /^conditions of sale$/i,
        /^terms & conditions/i,
        /^\d{12,}$/,
        /^\d{4,}$/
    ];
    lines = lines.filter(line => !ignorePatterns.some(pat => pat.test(line)));
    // Helper to extract by label (multi-word, optional colon/period)
    function extractByLabel(label, lines, pattern = /[:.\s]+(.+)/i) {
        for (const line of lines) {
            const regex = new RegExp(label + pattern.source, 'i');
            const match = line.match(regex);
            if (match) return match[1].trim();
        }
        return '';
    }
    // Extract by label (allow multi-word values)
    fields.order_no = extractByLabel('Order ?No\.?', lines);
    fields.ticket_type = extractByLabel('Ticket ?Type', lines);
    fields.category = extractByLabel('Category', lines);
    fields.price = extractByLabel('Ticket ?Price', lines, /[:.\s]+\$?([\d,.]+)/i);
    fields.door = extractByLabel('Door', lines);
    fields.entrance = extractByLabel('Entrance', lines);
    fields.section = extractByLabel('Section', lines);
    fields.row = extractByLabel('Row', lines);
    fields.seat = extractByLabel('Seat', lines);
    fields.queue_no = extractByLabel('Queue ?No\.?', lines);
    // Fallbacks for category
    if (!fields.category) {
        const catMatch = normText.match(/\b(CAT ?\d+|VIP STANDING|PREMIUM|GENERAL ADMISSION)\b/i);
        if (catMatch) fields.category = catMatch[1].trim();
    }
    // Fallback for price
    if (!fields.price) {
        const priceMatch = normText.match(/\$([\d,.]+)/);
        if (priceMatch) fields.price = priceMatch[1];
    }
    // Fallback for section (allow multi-word)
    if (!fields.section) {
        const secMatch = normText.match(/Section\s*[:.\s]+([A-Z0-9 \-]+)/i);
        if (secMatch) fields.section = secMatch[1].trim();
    }
    // Fallback for row
    if (!fields.row) {
        const rowMatch = normText.match(/Row\s*[:.\s]+([A-Z0-9]+)/i);
        if (rowMatch) fields.row = rowMatch[1].trim();
    }
    // Fallback for seat
    if (!fields.seat) {
        const seatMatch = normText.match(/Seat\s*[:.\s]+(\d+)/i);
        if (seatMatch) fields.seat = seatMatch[1].trim();
    }
    // Fallback for queue_no
    if (!fields.queue_no) {
        const queueMatch = normText.match(/Queue\s*No\.?\s*[:.\s]+(\w+)/i);
        if (queueMatch) fields.queue_no = queueMatch[1].trim();
    }
    // Fallback for door/entrance
    if (!fields.door) {
        const doorMatch = normText.match(/Door\s*[:.\s]+([A-Z0-9 \-]+)/i);
        if (doorMatch) fields.door = doorMatch[1].trim();
    }
    if (!fields.entrance) {
        const entMatch = normText.match(/Entrance\s*[:.\s]+([A-Z0-9 \-]+)/i);
        if (entMatch) fields.entrance = entMatch[1].trim();
    }
    // Event name: first all-caps line that is not a known header/footer/venue/category
    const knownNonEvent = [
        'NAME', 'ORDER', 'TICKET', 'CATEGORY', 'PRICE', 'DOOR', 'SECTION', 'ROW', 'SEAT', 'QUEUE', 'ENTRANCE',
        'DOORS OPEN', 'NO ADMISSION', 'NO PHOTOGRAPHY', 'CONDITIONS', 'TERMS', 'BARCODE', 'QR', 'CODE',
        'STAY CONNECTED', 'SINGAPORE SPORTS HUB', 'OCBC', 'CAPITOL THEATRE', 'GATEWAY THEATRE',
        'SINGAPORE EXPO', 'INDOOR STADIUM', 'TICKETMASTER', 'THIS IS YOUR TICKET'
    ];
    for (const line of lines) {
        if (
            line === line.toUpperCase() &&
            !knownNonEvent.some(word => line.includes(word)) &&
            !/^[\d\s]+$/.test(line) &&
            line.length > 3 &&
            !fields.venue || (fields.venue && !line.includes(fields.venue.toUpperCase()))
        ) {
            fields.event_name = line;
            break;
        }
    }
    // Venue: look for known venues
    const venueMatch = normText.match(/(SINGAPORE EXPO HALL \d+|GATEWAY THEATRE|SINGAPORE INDOOR STADIUM|CAPITOL THEATRE)/i);
    if (venueMatch) fields.venue = venueMatch[1].trim();
    // Date: look for lines with day, date, time
    const dateMatch = normText.match(/((MON|TUE|WED|THU|FRI|SAT|SUN) ?\d{1,2} ?[A-Z]{3,9} ?\d{4},? ?\d{1,2}:\d{2}(AM|PM)?)/i);
    if (dateMatch) fields.event_date = dateMatch[1].replace(/ +/g, ' ').replace(' ,', ',').trim();
    // Fallback for event name: first non-label, non-empty, non-all-numeric line
    if (!fields.event_name) {
        for (const line of lines) {
            if (
                line &&
                !knownNonEvent.some(word => line.includes(word)) &&
                !/^[\d\s]+$/.test(line)
            ) {
                fields.event_name = line;
                break;
            }
        }
    }
    console.log('Final extracted fields:', fields);
    return fields;
}

module.exports = { parseTicketText };