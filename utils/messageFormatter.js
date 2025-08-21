/**
 * Professional message formatting utility for Discord embeds
 * Handles line breaks, bullet points with proper hanging indents
 */

/**
 * Format a message with proper line breaks and bullet point formatting
 * @param {string} message - The message to format
 * @returns {string} - Formatted message with proper Discord formatting
 */
function formatMessage(message) {
    if (!message || typeof message !== 'string') {
        return message || '';
    }

    // First, process basic line breaks
    let formatted = message.replace(/\\n/g, '\n');

    // Handle bullet points with proper hanging indents
    // Replace • followed by text with Discord-formatted bullet
    formatted = formatted.replace(/^•\s*/gm, '• ');
    
    // Handle multi-line bullet points with hanging indents
    // This creates proper alignment for continuation lines
    const lines = formatted.split('\n');
    const formattedLines = [];
    let inBulletPoint = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if this line starts a bullet point
        if (line.trim().startsWith('•')) {
            inBulletPoint = true;
            formattedLines.push(line);
        } 
        // Check if this is a continuation of a bullet point
        else if (inBulletPoint && line.trim() !== '' && !line.trim().startsWith('•')) {
            // Add proper indentation for continuation lines (3 spaces to align with text after bullet)
            formattedLines.push('   ' + line.trim());
        }
        // Regular line or empty line (ends bullet point context)
        else {
            if (line.trim() === '') {
                inBulletPoint = false;
            } else {
                inBulletPoint = false;
            }
            formattedLines.push(line);
        }
    }
    
    return formattedLines.join('\n');
}

/**
 * Format bullet points with enhanced styling options
 * @param {string} message - The message to format
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted message
 */
function formatBulletPoints(message, options = {}) {
    const {
        bulletStyle = '•',
        indent = '   ', // 3 spaces for continuation lines
        numberedList = false
    } = options;

    if (!message || typeof message !== 'string') {
        return message || '';
    }

    let formatted = message.replace(/\\n/g, '\n');
    const lines = formatted.split('\n');
    const formattedLines = [];
    let bulletCounter = 1;
    let inList = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.trim().startsWith('•')) {
            inList = true;
            const content = line.replace(/^•\s*/, '').trim();
            
            if (numberedList) {
                formattedLines.push(`${bulletCounter}. ${content}`);
                bulletCounter++;
            } else {
                formattedLines.push(`${bulletStyle} ${content}`);
            }
        }
        else if (inList && line.trim() !== '' && !line.trim().startsWith('•')) {
            // Continuation line - add proper indent
            formattedLines.push(indent + line.trim());
        }
        else {
            if (line.trim() === '') {
                inList = false;
                bulletCounter = 1;
            } else {
                inList = false;
            }
            formattedLines.push(line);
        }
    }
    
    return formattedLines.join('\n');
}

/**
 * Create properly formatted lists for Discord embeds
 * @param {Array} items - Array of list items
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted list string
 */
function createFormattedList(items, options = {}) {
    const {
        bulletStyle = '•',
        numbered = false,
        indent = '   '
    } = options;

    if (!Array.isArray(items) || items.length === 0) {
        return '';
    }

    return items.map((item, index) => {
        if (numbered) {
            return `${index + 1}. ${item}`;
        } else {
            return `${bulletStyle} ${item}`;
        }
    }).join('\n');
}

module.exports = {
    formatMessage,
    formatBulletPoints,
    createFormattedList
};