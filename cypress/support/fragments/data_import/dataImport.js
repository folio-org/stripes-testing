import { getLongDelay } from '../../utils/cypressTools';
import getRandomPostfix from '../../utils/stringTools';
import TopMenu from '../topMenu';
import JobProfiles from './job_profiles/jobProfiles';
import SearchInventory from './searchInventory';

const goToDataImport = () => {
  cy.visit(TopMenu.dataImportPath);
};
const uploadFile = (fileName) => {
  cy.get('input[type=file]', getLongDelay()).attachFile({ filePath: 'oneMarcBib.mrc', fileName });
};

const uploadFileWithout999Field = (fileName) => {
  cy.get('input[type=file]', getLongDelay()).attachFile({ filePath: 'oneMarcBibWithout999Field.mrc', fileName });
};

export default {
  goToDataImport,
  uploadFile,
  uploadFileWithout999Field,

  uploadExportedFile(fileName) {
    cy.get('input[type=file]', getLongDelay()).attachFile(fileName);
  },
  uploadMarcBib: () => {
    // unique file name to upload
    const nameForMarcFileWithBib = `autotest1Bib${getRandomPostfix()}.mrc`;
    // upload a marc file for export
    goToDataImport();
    uploadFile(nameForMarcFileWithBib);
    JobProfiles.searchJobProfileForImport(JobProfiles.defaultInstanceAndSRSMarcBib);
    JobProfiles.runImportFile(nameForMarcFileWithBib);

    // get Instance HRID through API
    SearchInventory.getInstanceHRID()
      .then(id => {
        cy.wrap(id).as('requestedHrId');
      });
    return cy.get('@requestedHrId');
  }
};
