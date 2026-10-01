import {
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  MATCH_PROFILE_QUALIFIER_TYPES,
  RECORD_STATUSES,
} from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix, {
  randomNDigitNumber,
  getRandomLetters,
} from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Holdings files', () => {
    const randomPostfix = getRandomPostfix();
    const randomDigits = `1505076${randomNDigitNumber(6)}`;
    const instanceTitle = `AT_C1505079_MarcBibInstance_${randomPostfix}`;
    const letterPrefix = getRandomLetters(9);
    // Reused as templates - editFields/addFields overwrite by tag regardless of their content
    const seedHoldingsFileName = 'marcHoldingsForC1505076_1.mrc';
    const incomingHoldingsFileName = 'marcHoldingsForC1505076_2.mrc';
    const editedSeedFileName = `AT_C1505079_SeedHoldingsFile_${randomPostfix}.mrc`;
    const editedIncomingFileName = `AT_C1505079_IncomingHoldingsFile_${randomPostfix}.mrc`;
    const seed852Note = 'Holdings note';
    const updated852Note = 'Holdings note UPDATED';
    // Both existing 014 occurrences begin with our prefix (satisfying the qualifier), but only the
    // first has the same digits as the incoming value once whitespace is stripped
    const matchingFolValue = `${letterPrefix}${randomDigits}`;
    const nonMatchingFolValue = `${letterPrefix}2${randomDigits}`;
    // Same digits as matchingFolValue, but with internal spaces - differs only by whitespace
    const incomingFolValue = `${letterPrefix} ${randomDigits.slice(0, 3)} ${randomDigits.slice(3)}`;

    const mappingProfile = { name: `AT_C1505079 FMP MARC Holdings Update ${randomPostfix}` };
    const actionProfile = {
      name: `AT_C1505079 AP MARC Holdings Update ${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.MARC_HOLDINGS,
    };
    const matchProfile = {
      profileName: `AT_C1505079 MP MARC Holdings 014 $a ${randomPostfix}`,
      incomingRecordFields: { field: '014', in1: '*', in2: '*', subfield: 'a' },
      existingRecordFields: { field: '014', in1: '*', in2: '*', subfield: 'a' },
      recordType: EXISTING_RECORD_NAMES.MARC_HOLDINGS,
      qualifier: {
        qualifierType: MATCH_PROFILE_QUALIFIER_TYPES.BEGINS_WITH,
        qualifierValue: letterPrefix,
        comparisonPart: 'ALPHANUMERICS_ONLY',
      },
    };
    const jobProfile = { profileName: `AT_C1505079 JP MARC Holdings Update ${randomPostfix}` };

    let instanceId;
    let instanceHrid;
    let holdingsId;
    let locationCode;
    const testData = { user: {} };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        InventoryInstances.deleteFullInstancesByTitleViaApi('C1505079_');
        cy.createSimpleMarcBibViaAPI(instanceTitle).then((id) => {
          instanceId = id;
          cy.getInstanceById(id).then((instanceData) => {
            instanceHrid = instanceData.hrid;
          });
        });

        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
        }).then((location) => {
          locationCode = location.code;
        });

        // Update job profile chain: FMP -> AP -> MP -> JP, matching on 014 $a with both a
        // "Begins with" qualifier and "Alphanumerics only" applied on both sides
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
          .then(({ body }) => NewActionProfile.createActionProfileViaApi(actionProfile, body.id))
          .then((apResponse) => {
            const apId = apResponse.body.id;
            return NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
              matchProfile,
            ).then((mpResponse) => NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
              jobProfile.profileName,
              mpResponse.body.id,
              apId,
            ));
          });
      });

      cy.createTempUser([]).then((userProperties) => {
        testData.user = userProperties;
        cy.assignCapabilitiesToExistingUser(
          testData.user.userId,
          [],
          [
            CapabilitySets.uiDataImport,
            CapabilitySets.uiDataImportSettingsManage,
            CapabilitySets.uiInventoryInstanceView,
            CapabilitySets.uiQuickMarcQuickMarcHoldingsEditorView,
          ],
        );
      });
    });

    after('Delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${editedSeedFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${editedIncomingFileName}`);
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.user.userId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitle);
    });

    it(
      'C1505079 MARC holdings record is updated when matching on 014 $a with both a "Begins with" qualifier and "Alphanumerics only" configured (promin)',
      { tags: ['extendedPath', 'promin', 'C1505079'] },
      () => {
        // Prepare both files - placeholders replaced with the real instance HRID, location code,
        // and each file's 014 $a / 852 $z value. The seed record gets a SECOND 014 occurrence
        // (added, since it doesn't exist in the base fixture) that begins with our prefix too but has
        // different digits, so only the first occurrence is the actual match
        DataImport.editMarcFieldsInAllRecords(seedHoldingsFileName, editedSeedFileName, {
          editFields: [
            { tag: '004', content: instanceHrid },
            { tag: '014', content: `$a ${matchingFolValue}` },
            { tag: '852', content: `$b ${locationCode} $h TEST-CN $z ${seed852Note}` },
          ],
          addFields: [
            { tag: '014', indicators: ['1', '\\'], content: `$a ${nonMatchingFolValue}` },
          ],
        });
        DataImport.editMarcFieldsInAllRecords(incomingHoldingsFileName, editedIncomingFileName, {
          editFields: [
            { tag: '004', content: instanceHrid },
            { tag: '014', content: `$a ${incomingFolValue}` },
            { tag: '852', content: `$b ${locationCode} $h TEST-CN $z ${updated852Note}` },
          ],
        });

        // Steps 1-2: seed the original holdings record via API import
        cy.getToken(testData.user.username, testData.user.password);
        DataImport.uploadFileViaApi(
          editedSeedFileName,
          editedSeedFileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS,
        )
          .then((response) => {
            holdingsId = response[0].holding.id;
          })
          .then(() => {
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });

        // Step 3: original holdings record's MARC source shows both seeded 014 $a values
        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.viewSource();
        InventoryViewSource.checkRowExistsWithTagAndValue('014', matchingFolValue, true, {
          raw: true,
        });
        InventoryViewSource.checkRowExistsWithTagAndValue('014', nonMatchingFolValue, true, {
          raw: true,
        });

        // Step 4: import the incoming file (014 $a differs only by whitespace from the matching
        // occurrence) with the Update job profile from preconditions
        cy.visit(TopMenu.dataImportPath);
        DataImport.waitLoading();
        DataImport.uploadFile(editedIncomingFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();

        // Step 5: import completes; SRS and Holdings both show "Updated" - the qualifier plus
        // "Alphanumerics only" identify the matching occurrence, so the record is updated, not
        // duplicated
        Logs.waitFileIsImported(editedIncomingFileName);
        Logs.checkJobStatus(editedIncomingFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(editedIncomingFileName);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.UPDATED,
          FileDetails.columnNameInResultList.srsMarc,
        );
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.UPDATED,
          FileDetails.columnNameInResultList.holdings,
        );

        // Step 6: only one holdings record exists on the instance (updated, not duplicated), and
        // its 852 $z note now ends with "UPDATED"
        cy.visit(`/inventory/view/${instanceId}`);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.verifyHoldingsAccordionsCount(1);

        cy.getHoldings({ query: `instanceId=="${instanceId}"` }).then((holdingsRecords) => {
          expect(holdingsRecords).to.have.lengthOf(1);

          cy.visit(`/inventory/view/${instanceId}/${holdingsId}`);
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.viewSource();
          InventoryViewSource.checkRowExistsWithTagAndValue('852', updated852Note);
        });
      },
    );
  });
});
