import { DEFAULT_JOB_PROFILE_NAMES, EXISTING_RECORD_NAMES } from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import DataImport from '../../../support/fragments/data_import/dataImport';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Holdings files', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitle = `AT_C397991_MarcBibInstance_${randomPostfix}`;
    const holdingsFileName = 'marcHoldingsFileForC397991.mrc';
    const preupdatedHoldingsFileName = 'marcHoldingsFileForC397991preupdated.mrc';
    const editedHoldingsFileName = `C397991_MarcHoldingsFile_${randomPostfix}.mrc`;
    const editedPreupdatedFileName = `C397991_MarcHoldingsPreupdatedFile_${randomPostfix}.mrc`;
    const tag008 = '008';
    const dateEntProperty = 'Date Ent';
    const hridPlaceholder = 'plhd00000000000';
    const uuidPlaceholder = '00000000-0000-0000-0000-000000000000';

    const mappingProfile = { name: `AT_C397991 FMP MARC Holdings Update ${randomPostfix}` };
    const actionProfile = {
      name: `AT_C397991 AP MARC Holdings Update ${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.MARC_HOLDINGS,
    };
    const matchProfile = {
      profileName: `AT_C397991 MP MARC Holdings 999 $i ${randomPostfix}`,
      incomingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 'i' },
      existingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 'i' },
      recordType: EXISTING_RECORD_NAMES.MARC_HOLDINGS,
    };
    const jobProfile = { profileName: `AT_C397991 JP MARC Holdings Update ${randomPostfix}` };

    let instanceId;
    let instanceHrid;
    let holdingsId;
    const testData = { user: {} };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        cy.createSimpleMarcBibViaAPI(instanceTitle).then((id) => {
          instanceId = id;
          cy.getInstanceById(id).then((instanceData) => {
            instanceHrid = instanceData.hrid;
          });
        });

        // Create update job profile chain: FMP → AP → MP → JP
        SettingsFieldMappingProfiles.createMappingProfileViaApi({
          profile: {
            name: mappingProfile.name,
            incomingRecordType: EXISTING_RECORD_NAMES.MARC_HOLDINGS,
            existingRecordType: EXISTING_RECORD_NAMES.MARC_HOLDINGS,
            description: '',
            mappingDetails: {
              name: 'marcHoldings',
              recordType: EXISTING_RECORD_NAMES.MARC_HOLDINGS,
              marcMappingOption: 'UPDATE',
              mappingFields: [
                {
                  name: 'discoverySuppress',
                  enabled: true,
                  path: 'marcHoldings.discoverySuppress',
                  value: null,
                  booleanFieldAction: 'IGNORE',
                  subfields: [],
                },
                {
                  name: 'hrid',
                  enabled: true,
                  path: 'marcHoldings.hrid',
                  value: '',
                  subfields: [],
                },
              ],
            },
          },
          addedRelations: [],
          deletedRelations: [],
        })
          .then(({ body }) => {
            return NewActionProfile.createActionProfileViaApi(actionProfile, body.id);
          })
          .then((apResponse) => {
            const apId = apResponse.body.id;
            return NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
              matchProfile,
            ).then((mpResponse) => {
              NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
                jobProfile.profileName,
                mpResponse.body.id,
                apId,
              );
            });
          });
      });

      cy.createTempUser([]).then((userProperties) => {
        testData.user = userProperties;
        cy.assignCapabilitiesToExistingUser(
          testData.user.userId,
          [],
          [
            CapabilitySets.uiDataImport,
            CapabilitySets.uiInventory,
            CapabilitySets.uiQuickMarcQuickMarcHoldingsEditorManage,
          ],
        );
      });
    });

    after('Delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${editedHoldingsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${editedPreupdatedFileName}`);
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitle);
    });

    it(
      'C397991 Remove "008" field from "MARC Holdings" record via Data Import and then add new "008" in UI (promin)',
      { tags: ['extendedPath', 'promin', 'C397991'] },
      () => {
        const todayDateYYMMDD = DateTools.getCurrentDateYYMMDD();

        // Step 1: Edit original holdings file — replace HRID placeholder; import via API
        DataImport.editMarcFile(
          holdingsFileName,
          editedHoldingsFileName,
          [hridPlaceholder],
          [instanceHrid],
        );
        cy.getToken(testData.user.username, testData.user.password);
        DataImport.uploadFileViaApi(
          editedHoldingsFileName,
          editedHoldingsFileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS,
        )
          .then((response) => {
            holdingsId = response[0].holding.id;
          })
          .then(() => {
            DataImport.editMarcFile(
              preupdatedHoldingsFileName,
              editedPreupdatedFileName,
              [hridPlaceholder, uuidPlaceholder],
              [instanceHrid, holdingsId],
            );
            cy.getToken(testData.user.username, testData.user.password);
            DataImport.uploadFileViaApi(
              editedPreupdatedFileName,
              editedPreupdatedFileName,
              jobProfile.profileName,
            );
          })
          .then(() => {
            cy.login(testData.user.username, testData.user.password, {
              path: `/inventory/view/${instanceId}/${holdingsId}`,
              waiter: HoldingsRecordView.waitLoading,
            });
          });

        // Step 3: Open quickMARC — verify 008 is absent
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.checkTagAbsent(tag008);

        // Step 5: Add new 008 field; save & close
        cy.wait(3000);
        QuickMarcEditor.addNewField(tag008, '', 4);
        QuickMarcEditor.checkFieldsExist([tag008]);
        QuickMarcEditor.pressSaveAndClose();
        HoldingsRecordView.waitLoading();

        // Step 6: Re-open quickMARC; verify 008 boxes filled with "\" and Date Ent equals today
        cy.intercept('/records-editor/records?*').as('getHoldingsRecord');
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.checkOnlyBackslashesIn008BoxesHoldings();
        cy.wait('@getHoldingsRecord').then((res) => {
          const field008 = res.response.body.fields.find((field) => field.tag === tag008);
          expect(field008.content[dateEntProperty]).to.be.eq(todayDateYYMMDD);
        });
      },
    );
  });
});
