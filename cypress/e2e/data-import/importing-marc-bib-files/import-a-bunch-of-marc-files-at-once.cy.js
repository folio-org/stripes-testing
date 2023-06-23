import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import { INSTANCE_SOURCE_NAMES, JOB_STATUS_NAMES } from '../../../support/constants';

describe('ui-data-import', () => {
  const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
  
  beforeEach(() => {
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    cy.getAdminToken();
  });

  it('C6707 Import a bunch of MARC files at once (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
    
    });
});
