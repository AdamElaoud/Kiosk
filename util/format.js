module.exports = {
    footer: {
        text: "© Sap#5703",
        image: "https://i.imgur.com/c5AskA7.png"
    },
    emptyChar: " ‎",
    space(amt) {
        let whitespace = "";

        let i;
        for (i = 0; i < amt; i++) {
            whitespace += "\u00A0";
        }

        return whitespace;
    },
    isolateID(str) {
        const regex = /[0-9]+/g; // regex to isolate case ID

        const id = str.match(regex);

        if (id === null)
            return null;
        else        
            return str.match(regex)[0];
    }
}