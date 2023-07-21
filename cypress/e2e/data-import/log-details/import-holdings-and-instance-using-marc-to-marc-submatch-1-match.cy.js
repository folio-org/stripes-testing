import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Helper from '../../../support/fragments/finance/financeHelper';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import { INSTANCE_STATUS_TERM_NAMES,
  HOLDINGS_TYPE_NAMES,
  LOCATION_NAMES,
  FOLIO_RECORD_TYPE,
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  JOB_STATUS_NAMES } from '../../../support/constants';
import NewInstanceStatusType from '../../../support/fragments/settings/inventory/instances/instanceStatusTypes/newInstanceStatusType';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import FileManager from '../../../support/utils/fileManager';
import Users from '../../../support/fragments/users/users';
import InstanceStatusTypes from '../../../support/fragments/settings/inventory/instances/instanceStatusTypes/instanceStatusTypes';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('ui-data-import', () => {
  

  before('create test data and login', () => {
    cy.createTempUser([
      permissions.settingsDataImportEnabled.gui,
      permissions.moduleDataImportEnabled.gui,
      permissions.inventoryAll.gui,
      permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui
    ])
      .then(userProperties => {
        user = userProperties;

        MarcFieldProtection.createMarcFieldProtectionViaApi({
          indicator1: '*',
          indicator2: '*',
          subfield: '*',
          data: '*',
          source: 'USER',
          field: testData.protectedField
        })
          .then((resp) => {
            testData.protectedFieldId = resp.id;
          });
        NewInstanceStatusType.createViaApi()
          .then((initialInstanceStatusType) => {
            testData.instanceStatusTypeId = initialInstanceStatusType.body.id;
          });
        cy.login(user.username, user.password,
          { path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });
      });
  });

  it('C397984 Verify the ability to import Holdings and Instance using marc-to-marc submatch: 1 match (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      
    });
});