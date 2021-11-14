module.exports = class MessagesChatDetail {
    constructor(idMessage, usernameChat, content, timeChat) {
        this.isMessage = idMessage
        this.usernameChat = usernameChat
        this.content = content
        this.timeChat = timeChat
    }
}