import { getLongDelay } from '../../utils/cypressTools';
import getRandomPostfix from '../../utils/stringTools';
import JobProfiles from './job_profiles/jobProfiles';
import SearchInventory from './searchInventory';
import settingsMenu from '../settingsMenu';

const uploadFile = (filePathName, fileName) => {
  cy.get('input[type=file]', getLongDelay()).attachFile({ filePath: filePathName, fileName });
};

export default {
  uploadFile,

  uploadExportedFile(fileName) {
    cy.get('input[type=file]', getLongDelay()).attachFile(fileName);
  },
  uploadMarcBib: () => {
    // unique file name to upload
    const nameForMarcFileWithBib = `autotest1Bib${getRandomPostfix()}.mrc`;
    // upload a marc file for export
    cy.visit(`${settingsMenu.dataImportPath}`);
    uploadFile('oneMarcBib.mrc', nameForMarcFileWithBib);
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
