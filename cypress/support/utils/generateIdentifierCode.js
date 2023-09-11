export default {
  getRandomIdentifierCode: () => {
    // returns random 3 digit code for the identifier in the marcBib file
    const lettersUC = 'ABDEFGHKM';
    let str = '';
    for (let i = 0; i < 3; i++) {
      const position = Math.floor(Math.random() * lettersUC.length);
      str += lettersUC.substring(position, position + 1);
    }
    return str;
  },
};
