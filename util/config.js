module.exports = {
    owner: {
        id: "193427298958049280",
        pub: "<@193427298958049280>"
    },
    devmode: false,
    newUpdate: false,
    prefix() { 
        return module.exports.devmode ? "!pet" : "pet";
    }
}