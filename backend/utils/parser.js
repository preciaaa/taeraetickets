function parseTicketText(text) {
    console.log('Parsing text:', text);
    const fields = {
        event_name: '',
        venue: '',
        date: '',
        category: '',
        price: '',
        section: '',
        row: '',
        seat: '',
        order_no: '',
        ticket_type: '',
        queue_no: '',
        door: '',
        entrance: '',
        name: '',
        door_open_time: ''
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

    // --- Markdown Table Parsing ---
    // Find all lines that look like table rows
    const tableRows = lines.filter(line => line.startsWith('|') && line.endsWith('|'));
    if (tableRows.length > 0) {
        tableRows.forEach(row => {
            // Split by | and trim
            const cells = row.split('|').map(cell => cell.trim()).filter(Boolean);
            if (cells.length >= 2) {
                // Map left cell to field, right cell to value
                const label = cells[0].toLowerCase();
                const value = cells.slice(1).join(' ').replace(/\s+/g, ' ').trim();
                if (label.includes('name')) fields.name = value;
                else if (label.includes('order no')) fields.order_no = value.replace(/[^\w\d]/g, '');
                else if (label.includes('ticket type')) fields.ticket_type = value;
                else if (label.includes('category')) fields.category = value;
                else if (label.includes('ticket price')) fields.price = value.replace(/[^\d.]/g, '');
                else if (label === 'door') fields.door = value;
                else if (label === 'entrance') fields.entrance = value;
                else if (label.includes('section')) fields.section = value;
                else if (label.includes('queue no')) fields.queue_no = value;
                // Handle row/seat in one row
                else if (label.includes('row')) {
                    // e.g. "A | Seat : 15 |"
                    const seatMatch = value.match(/seat\s*:?\s*(\w+)/i);
                    const rowMatch = value.match(/^[A-Z0-9]+/i);
                    if (rowMatch) fields.row = rowMatch[0];
                    if (seatMatch) fields.seat = seatMatch[1];
                }
            }
        });
    }

    // Fallback: label-based extraction for non-table tickets or missing fields
    function extractByLabel(label, lines, pattern = /[:.\s]+(.+)/i) {
        for (const line of lines) {
            const regex = new RegExp(label + pattern.source, 'i');
            const match = line.match(regex);
            if (match) return match[1].trim();
        }
        return '';
    }
    if (!fields.order_no) fields.order_no = extractByLabel('Order ?No\.?', lines);
    if (!fields.ticket_type) fields.ticket_type = extractByLabel('Ticket ?Type', lines);
    if (!fields.category) fields.category = extractByLabel('Category', lines);
    if (!fields.price) {
        let price = extractByLabel('Ticket ?Price', lines, /[:.\s]+\$?([\d,.]+)/i);
        if (!price) {
            const priceMatch = normText.match(/\$([\d,.]+)/);
            if (priceMatch) price = priceMatch[1];
        }
        fields.price = price;
    }
    if (!fields.door) fields.door = extractByLabel('Door', lines);
    if (!fields.entrance) fields.entrance = extractByLabel('Entrance', lines);
    if (!fields.section) fields.section = extractByLabel('Section', lines);
    if (!fields.row) fields.row = extractByLabel('Row', lines);
    if (!fields.seat) fields.seat = extractByLabel('Seat', lines);
    if (!fields.queue_no) fields.queue_no = extractByLabel('Queue ?No\.?', lines);
    if (!fields.name) fields.name = extractByLabel('Name', lines);
    // Door open time (look for 'Doors open at ...')
    for (const line of lines) {
        const match = line.match(/Doors open at ([0-9:.apm ]+)/i);
        if (match) {
            fields.door_open_time = match[1].trim();
            break;
        }
    }
    // Event name: first all-caps line that is not a known header/footer/venue/category
    const knownNonEvent = [
        'NAME', 'ORDER', 'TICKET', 'CATEGORY', 'PRICE', 'DOOR', 'SECTION', 'ROW', 'SEAT', 'QUEUE', 'ENTRANCE',
        'DOORS OPEN', 'NO ADMISSION', 'NO PHOTOGRAPHY', 'CONDITIONS', 'TERMS', 'BARCODE', 'QR', 'CODE',
        'STAY CONNECTED', 'SINGAPORE SPORTS HUB', 'OCBC', 'CAPITOL THEATRE', 'GATEWAY THEATRE',
        'SINGAPORE EXPO', 'INDOOR STADIUM', 'TICKETMASTER', 'THIS IS YOUR TICKET'
    ];
    if (!fields.event_name) {
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
    }
    // Venue: look for known venues
    const venueMatch = normText.match(/(SINGAPORE EXPO HALL \d+|GATEWAY THEATRE|SINGAPORE INDOOR STADIUM|CAPITOL THEATRE)/i);
    if (venueMatch) fields.venue = venueMatch[1].trim();
    // Date: look for lines with day, date, time
    const dateMatch = normText.match(/((MON|TUE|WED|THU|FRI|SAT|SUN) ?\d{1,2} ?[A-Z]{3,9} ?\d{4},? ?\d{1,2}:\d{2}(AM|PM)?)/i);
    if (dateMatch) fields.date = dateMatch[1].replace(/ +/g, ' ').replace(' ,', ',').trim();
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
    // Sanitize seat_number to be only digits if possible
    if (fields.seat) {
        const seatNum = fields.seat.match(/\d+/);
        if (seatNum) fields.seat = seatNum[0];
    }
    // Sanitize row to be a single value (first word/letter)
    if (fields.row) {
        const rowVal = fields.row.match(/[A-Z0-9]+/i);
        if (rowVal) fields.row = rowVal[0];
    }
    // Sanitize section to be a single value (first word/number)
    if (fields.section) {
        const secVal = fields.section.match(/[A-Z0-9]+/i);
        if (secVal) fields.section = secVal[0];
    }
    // Sanitize price to be float string
    if (fields.price) {
        const priceVal = fields.price.match(/\d+(\.\d+)?/);
        if (priceVal) fields.price = priceVal[0];
    }
    // Sanitize order_no to be only digits
    if (fields.order_no) {
        const orderVal = fields.order_no.match(/\d+/);
        if (orderVal) fields.order_no = orderVal[0];
    }
    // --- REFINED EXTRACTION FOR SPECIFIED FIELDS ONLY ---
    // Helper for label-based extraction
    function extractByLabelAny(labels, lines, pattern = /[:.\s]+(.+)/i) {
        for (const label of labels) {
            for (const line of lines) {
                const regex = new RegExp(label + pattern.source, 'i');
                const match = line.match(regex);
                if (match) return match[1].trim();
            }
        }
        return '';
    }
    // 1. section (allow multi-word, table or label)
    let section = '';
    if (fields.section) section = fields.section;
    else section = extractByLabelAny(['Section'], lines);
    if (!section) {
        // Fallback: regex for 'Section: ...' or 'Section ...'
        const secMatch = lines.join('\n').match(/Section\s*[:.\s]+([A-Z0-9 \-]+)(?=\n|$)/i);
        if (secMatch) section = secMatch[1].trim();
    }
    fields.section = section || null;
    // 2. row (extract only after 'Row:' and before next pipe or 'Seat')
    let row = '';
    if (fields.row) row = fields.row;
    else row = extractByLabelAny(['Row'], lines);
    if (row) {
        // If row is like 'Row : A | Seat : 15', extract 'A'
        const rowMatch = row.match(/Row\s*:?\s*([^|\n]+?)(?=\s*\||\s*Seat|$)/i);
        if (rowMatch) {
            let rowVal = rowMatch[1].trim();
            if (rowVal && rowVal.toLowerCase() !== 'seat') {
                row = rowVal;
            } else {
                const fallbackRow = row.match(/[A-Z0-9]+/i);
                if (fallbackRow) row = fallbackRow[0];
            }
        } else {
            const fallbackRow = row.match(/[A-Z0-9]+/i);
            if (fallbackRow) row = fallbackRow[0];
        }
    } else {
        row = null;
    }
    fields.row = row;
    // 3. date (flexible regex, fallback to original string)
    let date = fields.date || '';
    if (!date) {
        // Look for lines with day, date, time
        const dateLine = lines.find(l => l.match(/\b(MON|TUE|WED|THU|FRI|SAT|SUN)\b.*\d{1,2}:\d{2}/i));
        if (dateLine) date = dateLine.trim();
    }
    // Try to parse to ISO, else fallback
    if (date) {
        const dateMatch = date.match(/(\w{3,}) (\d{1,2}) (\w{3,}) (\d{4}),? (\d{1,2}:\d{2})(AM|PM)/i);
        if (dateMatch) {
            const [_, day, dayNum, month, year, time, ampm] = dateMatch;
            const months = {JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11};
            const monthIdx = months[month.toUpperCase()];
            let [hour, minute] = time.split(':').map(Number);
            if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
            if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
            const jsDate = new Date(Number(year), monthIdx, Number(dayNum), hour, minute);
            if (!isNaN(jsDate.getTime())) {
                date = jsDate.toISOString();
            }
        }
    }
    fields.date = date || null;
    // 4. price (look for 'Ticket Price', 'Price', or any $ followed by numbers)
    let price = fields.price || '';
    if (!price) price = extractByLabelAny(['Ticket Price', 'Price'], lines, /[:.\s]+\$?([\d,.]+)/i);
    if (!price) {
        const priceMatch = lines.join('\n').match(/\$([\d,.]+)/);
        if (priceMatch) price = priceMatch[1];
    }
    fields.price = price || null;
    // 5. category (label, table, fallback null)
    let category = fields.category || '';
    if (!category) category = extractByLabelAny(['Category'], lines);
    fields.category = category || null;
    // 6. order_no (label, table, fallback null)
    let order_no = fields.order_no || '';
    if (!order_no) order_no = extractByLabelAny(['Order ?No\.?'], lines);
    fields.order_no = order_no || null;
    // 7. ticket_type (label, table, fallback null)
    let ticket_type = fields.ticket_type || '';
    if (!ticket_type) ticket_type = extractByLabelAny(['Ticket ?Type'], lines);
    fields.ticket_type = ticket_type || null;
    // 8. queue_no (label, table, fallback null)
    let queue_no = fields.queue_no || '';
    if (!queue_no) queue_no = extractByLabelAny(['Queue ?No\.?', 'Queue Number'], lines);
    fields.queue_no = queue_no || null;
    // 9. entrance (label, table, fallback null)
    let entrance = fields.entrance || '';
    if (!entrance) entrance = extractByLabelAny(['Entrance'], lines);
    fields.entrance = entrance || null;
    // 10. door (label, table, fallback null)
    let door = fields.door || '';
    if (!door) door = extractByLabelAny(['Door'], lines);
    fields.door = door || null;
    console.log('Final extracted fields:', fields);
    return fields;
}

module.exports = { parseTicketText };