// ES6 export and global debug
export function debug(message, data = null, level = 'log') {
    switch (level) {
        case 'log':
            console.log(message, data);
            break;
        case 'warn':
            console.warn(message, data);
            break;
        case 'error':
            console.error(message, data);
            break;
        default:
            console.log('DEBUG: Unknown debug level:', level);
            console.log(message, data);
            break;
    }
}
// Make debug globally available
if (typeof window !== 'undefined') {
    window.debug = debug;
}