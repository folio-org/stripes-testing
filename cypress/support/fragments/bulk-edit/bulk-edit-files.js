import FileManager from '../../utils/fileManager';

export default {
  verifyMatchedResultFileContent(fileName, expectedResult) {
    // expectedResult is list of expected values
    FileManager.findDownloadedFilesByMask(fileName)
      .then((downloadedFilenames) => {
        FileManager.readFile(downloadedFilenames[0])
          .then((actualContent) => {
            const values = this.getValuesFromMatchedCSVFile(actualContent);
            // verify each row in csv file
            values.forEach((elem, index) => {
              this.verifyMatchedResultByItemBarcode(elem, expectedResult[index]);
            });
          });
      });
  },

  getValuesFromMatchedCSVFile(content) {
    // parse csv and delete first headers row and last whitespace
    const valuesList = content.split('\n');
    valuesList.shift();
    valuesList.pop();
    return valuesList;
  },

  verifyMatchedResultByItemBarcode(actualResult, expectedBarcode) {
    const actualBarcode = actualResult.split(',')[9];
    expect(actualBarcode).to.eq(expectedBarcode);
  },
};
