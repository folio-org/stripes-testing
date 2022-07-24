import { Button, Section, HTML, including, PaneHeader, Pane } from '../../../../interactors';
import { getLongDelay } from '../../utils/cypressTools';
import getRandomPostfix from '../../utils/stringTools';
import JobProfiles from './job_profiles/jobProfiles';
import SearchInventory from './searchInventory';
import TopMenu from '../topMenu';
import DataImportUploadFile from '../../../../interactors/dataImportUploadFile';
import MarcAuthority from '../marcAuthority/marcAuthority';
import MarcAuthoritiesSearch from '../marcAuthority/marcAuthoritiesSearch';
import MarcAuthorities from '../marcAuthority/marcAuthorities';

const sectionPaneJobsTitle = Section({ id: 'pane-jobs-title' });

const uploadFile = (filePathName, fileName) => {
  cy.get('input[type=file]', getLongDelay()).attachFile({ filePath: filePathName, fileName });
};

const waitLoading = () => {
  cy.expect(sectionPaneJobsTitle.exists());
  cy.expect(sectionPaneJobsTitle.find(HTML(including('Loading'))).absent());
  cy.expect(PaneHeader({ id:'paneHeaderpane-logs-title' }).find(Button('Actions')).exists());
};

const getLinkToAuthority = (title) => cy.then(() => Button(title).href());

// file to upload - MarcAuthority.defaultAuthority
// link to visit - defined with the parameter MarcAuthority.defaultAuthority.headingReference
const importFile = (profileName, uniqueFileName) => {
  uploadFile(MarcAuthority.defaultAuthority.name, uniqueFileName);

  JobProfiles.waitLoadingList();
  JobProfiles.select(profileName);
  JobProfiles.runImportFile(uniqueFileName);
  JobProfiles.openFileRecords(uniqueFileName);

  getLinkToAuthority(MarcAuthority.defaultAuthority.headingReference).then(link => {
    const jobLogEntriesUid = link.split('/').at(-2);
    const recordId = link.split('/').at(-1);

    cy.intercept({
      method: 'GET',
      url: `/metadata-provider/jobLogEntries/${jobLogEntriesUid}/records/${recordId}`,
    }).as('getRecord');

    cy.visit(link);

    cy.wait('@getRecord', getLongDelay()).then(request => {
      const internalAuthorityId = request.response.body.relatedAuthorityInfo.idList[0];

      cy.visit(TopMenu.marcAuthorities);
      MarcAuthoritiesSearch.searchBy('Uniform title', MarcAuthority.defaultAuthority.headingReference);
      MarcAuthorities.select(internalAuthorityId);
      MarcAuthority.waitLoading();
    });
  });
};

export default {
  importFile,
  uploadFile,
  waitLoading,

  uploadExportedFile(fileName) {
    cy.get('input[type=file]', getLongDelay()).attachFile(fileName);
  },

  uploadMarcBib: () => {
    // unique file name to upload
    const nameForMarcFileWithBib = `autotest1Bib${getRandomPostfix()}.mrc`;
    // upload a marc file for export
    cy.visit(TopMenu.dataImportPath);
    uploadFile('oneMarcBib.mrc', nameForMarcFileWithBib);
    JobProfiles.searchJobProfileForImport(JobProfiles.defaultInstanceAndSRSMarcBib);
    JobProfiles.runImportFile(nameForMarcFileWithBib);

    // get Instance HRID through API
    SearchInventory.getInstanceHRID()
      .then(id => {
        cy.wrap(id).as('requestedHrId');
      });
    return cy.get('@requestedHrId');
  },

  getLinkToAuthority: (title) => cy.then(() => Button(title).href()),

  // delete file if it hangs unimported before test
  checkUploadState:() => {
    cy.allure().startStep('Delete files before upload file');
    cy.visit(TopMenu.dataImportPath);
    waitLoading();
    cy.then(() => DataImportUploadFile().isDeleteFilesButtonExists()).then(isDeleteFilesButtonExists => {
      if (isDeleteFilesButtonExists) {
        cy.do(Button('Delete files').click());
        cy.expect(Button('or choose files').exists());
        cy.allure().endStep();
      }
    });
  },

  checkIsLandingPageOpened:() => {
    cy.expect(Pane({ id:'pane-jobs-title' }).find(Button('or choose files')).exists());
    cy.expect(PaneHeader({ id:'paneHeaderpane-logs-title' }).find(Button('Actions')).exists());
  }
};
