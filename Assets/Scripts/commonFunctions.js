// ES6 export and global debug
const log_log = false;
const log_warn = true;
const log_error = true;

export function debug(message, data = null, level = 'log') {
    let file = '', func = '', line = '', col = '';
    try {
        const stack = new Error().stack.split('\n');
        // Find the first stack line that is not this debug function
        let callerLine = stack.find(l => l.includes('at') && !l.includes('debug')) || stack[2];
        // Chrome/Edge: at functionName (fileURL:line:col)
        // Firefox: functionName@fileURL:line:col
        let match = callerLine.match(/at (.*?) \((.*?):(\d+):(\d+)\)/) ||
                    callerLine.match(/at (.*?):(\d+):(\d+)/) ||
                    callerLine.match(/(.*?)@(.*?):(\d+):(\d+)/);
        if (match) {
            if (match.length === 5) {
                func = match[1];
                file = match[2].split('/').pop();
                line = match[3];
                col = match[4];
            } else if (match.length === 4) {
                func = '';
                file = match[1].split('/').pop();
                line = match[2];
                col = match[3];
            }
        } else {
            file = 'unknown';
        }
    } catch (e) {
        file = 'unknown';
    }
    const prefix = `[${file}${func ? ' | ' + func : ''}${line ? ':' + line : ''}${col ? ':' + col : ''}]`;
    switch (level) {
        case 'log':
            if(log_log)
                console.log(prefix, message, data);
            break;
        case 'warn':
            if(log_warn)
                console.warn(prefix, message, data);
            break;
        case 'error':
            if(log_error)
                console.error(prefix, message, data);
            break;
        default:
            console.log('DEBUG: Unknown debug level:', level);
            console.log(prefix, message, data);
            break;
    }
}
// Make debug globally available
if (typeof window !== 'undefined') {
    window.debug = debug;
}