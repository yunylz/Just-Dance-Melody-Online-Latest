const fs = require('fs');

class TicketReader {
    constructor(buffer) {
        this.buffer = buffer;
        this.position = 0;
    }

    readByte() {
        if (this.position >= this.buffer.length) {
            throw new Error('Unexpected end of buffer');
        }
        return this.buffer[this.position++];
    }

    readBytes(count) {
        if (this.position + count > this.buffer.length) {
            throw new Error('Unexpected end of buffer');
        }
        const result = this.buffer.slice(this.position, this.position + count);
        this.position += count;
        return result;
    }

    readUInt16BE() {
        const bytes = this.readBytes(2);
        return bytes.readUInt16BE(0);
    }

    readUInt32BE() {
        const bytes = this.readBytes(4);
        return bytes.readUInt32BE(0);
    }

    readUInt64BE() {
        const bytes = this.readBytes(8);
        return bytes.readBigUInt64BE(0);
    }

    readTicketVersion() {
        const firstByte = this.readByte();
        const major = firstByte >> 4;
        const minor = this.readByte();
        return { major, minor };
    }

    readTicketHeader() {
        // Skip header (4 bytes)
        this.readBytes(4);
        // Return ticket length
        return this.readUInt16BE();
    }

    readTicketSectionHeader() {
        const position = this.position;
        
        const sectionHeader = this.readByte();
        if (sectionHeader !== 0x30) {
            throw new Error(`Expected 0x30 for section header, was 0x${sectionHeader.toString(16)}`);
        }
        
        const type = this.readByte();
        const length = this.readUInt16BE();
        
        return { type, length, position };
    }

    readTicketData(expectedType = null) {
        const type = this.readUInt16BE();
        const length = this.readUInt16BE();
        
        console.log(`Reading data type: ${type} (0x${type.toString(16)}), length: ${length}`);
        
        if (expectedType !== null && type !== expectedType) {
            throw new Error(`Expected data type ${expectedType}, got ${type} at position ${this.position - 4}`);
        }
        
        return { type, length };
    }

    readTicketBinaryData(dataType = 8) { // 8 = Binary
        const data = this.readTicketData(dataType);
        return this.readBytes(data.length);
    }

    readTicketStringData(dataType = 4) { // 4 = String
        const binaryData = this.readTicketBinaryData(dataType);
        // Convert to string and trim null terminators
        return binaryData.toString('utf8').replace(/\0+$/, '');
    }

    readTicketUInt32Data() {
        this.readTicketData(1); // 1 = UInt32
        return this.readUInt32BE();
    }

    readTicketUInt64Data() {
        this.readTicketData(2); // 2 = UInt64
        return this.readUInt64BE();
    }

    readTicketTimestampData() {
        this.readTicketData(7); // 7 = Timestamp
        const timestamp = this.readUInt64BE();
        return new Date(Number(timestamp));
    }

    skipTicketEmptyData(sections = 1) {
        for (let i = 0; i < sections; i++) {
            this.readTicketData(0); // 0 = Empty
        }
    }
}

class PS3TicketParser {
    static parseTicket(ticketData) {
        const reader = new TicketReader(ticketData);
        const ticket = {};

        // Read version and header
        ticket.version = reader.readTicketVersion();
        ticket.ticketLength = reader.readTicketHeader();

        console.log(`Ticket version: ${ticket.version.major}.${ticket.version.minor}`);
        console.log(`Ticket length: ${ticket.ticketLength} bytes`);

        // Read body section header
        const bodySection = reader.readTicketSectionHeader();
        console.log(`Body section type: ${bodySection.type}, length: ${bodySection.length}`);

        if (bodySection.type !== 0) { // 0 = Body
            throw new Error(`Expected first section to be Body (0), got ${bodySection.type}`);
        }

        ticket.bodySection = bodySection;

        // Parse based on version
        if (ticket.version.major === 2 && ticket.version.minor === 1) {
            this.parseTicket21(ticket, reader);
        } else if (ticket.version.major === 3 && ticket.version.minor === 0) {
            this.parseTicket30(ticket, reader);
        } else {
            throw new Error(`Unknown ticket version ${ticket.version.major}.${ticket.version.minor}`);
        }

        // Read footer section
        const footer = reader.readTicketSectionHeader();
        if (footer.type !== 2) { // 2 = Footer
            throw new Error(`Expected last section to be Footer (2), got ${footer.type}`);
        }

        // Read signature
        ticket.signatureIdentifier = reader.readTicketStringData(8); // 8 = Binary
        ticket.signatureData = reader.readTicketBinaryData();

        return ticket;
    }

    static parseTicket21(ticket, reader) {
        console.log(`Starting ticket 2.1 parsing at position: ${reader.position}`);
        
        // Read serial ID as binary data
        ticket.serialId = reader.readTicketStringData(8); // Binary
        console.log(`Serial ID: ${ticket.serialId}`);
        
        // Read issuer ID
        ticket.issuerId = reader.readTicketUInt32Data();
        console.log(`Issuer ID: ${ticket.issuerId}`);
        
        // Read timestamps
        ticket.issuedDate = reader.readTicketTimestampData();
        ticket.expiryDate = reader.readTicketTimestampData();
        console.log(`Dates: ${ticket.issuedDate} - ${ticket.expiryDate}`);
        
        // Read user info
        ticket.userId = reader.readTicketUInt64Data();
        console.log(`User ID: ${ticket.userId}`);
        
        ticket.username = reader.readTicketStringData(4); // String type = 4
        console.log(`Username: ${ticket.username}`);
        
        // Read location info
        ticket.country = reader.readTicketStringData(8); // Binary
        ticket.domain = reader.readTicketStringData(4); // String
        
        // Read service info
        ticket.serviceId = reader.readTicketStringData(8); // Binary
        
        // Extract title ID from service ID using regex
        const serviceIdMatch = ticket.serviceId.match(/(?<=-)[A-Z0-9]{9}(?=_)/);
        ticket.titleId = serviceIdMatch ? serviceIdMatch[0] : '';
        
        // Read status as ticket data (it's actually wrapped)
        ticket.status = reader.readTicketUInt32Data();
        console.log(`Status: ${ticket.status}`);
        
        // Skip any remaining bytes in the body section
        const bodyEndPosition = ticket.bodySection.position + ticket.bodySection.length + 4;
        console.log(`Current position: ${reader.position}, body section ends at: ${bodyEndPosition}`);
        
        // Skip remaining bytes to reach footer
        while (reader.position < bodyEndPosition) {
            reader.readByte();
        }
    }

    static parseTicket30(ticket, reader) {
        ticket.serialId = reader.readTicketStringData(8); // Binary
        ticket.issuerId = reader.readTicketUInt32Data();
        ticket.issuedDate = reader.readTicketTimestampData();
        ticket.expiryDate = reader.readTicketTimestampData();
        ticket.userId = reader.readTicketUInt64Data();
        ticket.username = reader.readTicketStringData(); // String
        ticket.country = reader.readTicketStringData(8); // Binary
        ticket.domain = reader.readTicketStringData(); // String
        ticket.serviceId = reader.readTicketStringData(8); // Binary
        
        // Extract title ID from service ID using regex
        const serviceIdMatch = ticket.serviceId.match(/(?<=-)[A-Z0-9]{9}(?=_)/);
        ticket.titleId = serviceIdMatch ? serviceIdMatch[0] : '';
        
        // Read DateOfBirth section
        const dobHeader = reader.readTicketSectionHeader();
        if (dobHeader.type !== 17) { // 17 = DateOfBirth
            throw new Error(`Expected DateOfBirth section (17), got ${dobHeader.type}`);
        }
        
        reader.readUInt32BE(); // Birthdate
        reader.skipTicketEmptyData(2); // Padding
        
        // Read Age section
        const ageHeader = reader.readTicketSectionHeader();
        if (ageHeader.type !== 16) { // 16 = Age
            throw new Error(`Expected Age section (16), got ${ageHeader.type}`);
        }
        
        reader.skipTicketEmptyData();
    }
}

// Usage example
function parsePS3Ticket(base64TicketData) {
    try {
        // Convert base64 to buffer
        const ticketBuffer = Buffer.from(base64TicketData, 'base64');
        
        // Parse the ticket
        const ticket = PS3TicketParser.parseTicket(ticketBuffer);
        
        return ticket;
    } catch (error) {
        console.error('Error parsing ticket:', error.message);
        throw error;
    }
}

// Example usage with your ticket data
const ticketBase64 = "IQEAAAAAAPAwAACkAAgAFICKEkIklu1W5m41rToMO6dPUwvjAAEABAAAAQAABwAIAAABmQszLT8ABwAIAAABmRBZh9gAAgAIA7LJa+0x0J0ABAAgbWVmaXNpT3dPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAEcGwAAQAEAARiNQAAAAgAGFVQMDAwMS1CTFVTMzE0NTRfMDAAAAAAAAABAAQgAAIAAAAAAAAAAAAwAgBEAAgABFl/2zIACAA4MDUCGC2JKAD9i59Lskp00mBeWkmLRhmkk1PMCwIZAOw8PPLuu2zlWM+/vhqJDJRKl4eiBKzvzwA=";

try {
    const ticket = parsePS3Ticket(ticketBase64);
    
    console.log('=== Ticket Information ===');
    console.log(`Version: ${ticket.version.major}.${ticket.version.minor}`);
    console.log(`Serial ID: ${ticket.serialId}`);
    console.log(`Issuer ID: ${ticket.issuerId}`);
    console.log(`User ID: ${ticket.userId}`);
    console.log(`Username: ${ticket.username}`);
    console.log(`Country: ${ticket.country}`);
    console.log(`Domain: ${ticket.domain}`);
    console.log(`Service ID: ${ticket.serviceId}`);
    console.log(`Title ID: ${ticket.titleId}`);
    console.log(`Issued Date: ${ticket.issuedDate}`);
    console.log(`Expiry Date: ${ticket.expiryDate}`);
    console.log(`Status: ${ticket.status}`);
    
} catch (error) {
    console.error('Failed to parse ticket:', error.message);
}