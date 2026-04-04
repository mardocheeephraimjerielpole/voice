class ErrorHandler {
    constructor() {
        this.errorLog = [];
    }

    logError(error) {
        const timestamp = new Date().toISOString();
        const errorEntry = `${timestamp} - ${error.name}: ${error.message}`;
        this.errorLog.push(errorEntry);
        console.error(errorEntry);
    }

    categorizeError(error) {
        if (error instanceof SyntaxError) {
            return 'Syntax Error';
        } else if (error instanceof TypeError) {
            return 'Type Error';
        } else if (error instanceof ReferenceError) {
            return 'Reference Error';
        } else {
            return 'General Error';
        }
    }

    reportError(error) {
        const category = this.categorizeError(error);
        // Here you could implement a reporting system, e.g., send it to a monitoring server.
        console.log(`Reporting ${category}: ${error.message}`);
    }

    handleError(error) {
        this.logError(error);
        this.reportError(error);
    }
}

// Example usage:
const errorHandler = new ErrorHandler();
try {
    // Simulate an error
    throw new TypeError('This is a type error!');
} catch (error) {
    errorHandler.handleError(error);
}