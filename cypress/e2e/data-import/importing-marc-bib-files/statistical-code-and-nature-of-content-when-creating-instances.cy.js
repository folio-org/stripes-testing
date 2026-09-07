import { including } from '@interactors/html';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NatureOfContent from '../../../support/fragments/settings/inventory/instances/natureOfContent';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import {
  INCOMING_RECORD_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
} from '../../../support/constants/constants';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {
      statCode1: {},
      statCode2: {},
      nocTerm1: {},
      nocTerm2: {},
    };
    const randomPostfix = getRandomPostfix();
    const marcFileName = `C17042_autotestFile${randomPostfix}.mrc`;

    const mappingProfile = { name: `AT_C17042_InstanceMappingProfile_${randomPostfix}` };
    const actionProfile = {
      name: `AT_C17042_InstanceActionProfile_${randomPostfix}`,
      action: 'CREATE',
      folioRecordType: EXISTING_RECORD_NAMES.INSTANCE,
    };
    const jobProfile = { profileName: `AT_C17042_JobProfile_${randomPostfix}` };

    before('Create test data via API', () => {
      cy.getAdminToken();

      // Step 1: Fetch 2 statistical codes and 2 nature of content terms sequentially
      cy.getStatisticalCodes({
        query: 'name<>"*auto*"',
        limit: 2,
      })
        .then((codes) => {
          cy.getStatisticalCodeTypes({ limit: 1000 }).then((types) => {
            const code1TypeName = types.filter(
              (type) => type.id === codes[0].statisticalCodeTypeId,
            )[0].name;
            const code2TypeName = types.filter(
              (type) => type.id === codes[1].statisticalCodeTypeId,
            )[0].name;
            testData.statCode1 = {
              id: codes[0].id,
              name: `${codes[0].name}`,
              displayName: `${code1TypeName}: ${codes[0].code} - ${codes[0].name}`,
            };
            testData.statCode2 = {
              id: codes[1].id,
              name: `${codes[1].name}`,
              displayName: `${code2TypeName}: ${codes[1].code} - ${codes[1].name}`,
            };
          });
        })
        .then(() => {
          NatureOfContent.getViaApi({ limit: 2 }).then((body) => {
            testData.nocTerm1 = {
              id: body.natureOfContentTerms[0].id,
              name: body.natureOfContentTerms[0].name,
            };
            testData.nocTerm2 = {
              id: body.natureOfContentTerms[1].id,
              name: body.natureOfContentTerms[1].name,
            };
          });
        })
        .then(() => {
          // Step 2: Create mapping profile with statistical codes and nature of content
          FieldMappingProfiles.createMappingProfileViaApi({
            profile: {
              name: mappingProfile.name,
              incomingRecordType: INCOMING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
              existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
              mappingDetails: {
                name: FOLIO_RECORD_TYPE.INSTANCE.toLowerCase(),
                recordType: EXISTING_RECORD_NAMES.INSTANCE,
                mappingFields: [
                  {
                    name: 'statisticalCodeIds',
                    enabled: true,
                    path: 'instance.statisticalCodeIds[]',
                    value: '',
                    subfields: [
                      {
                        order: 0,
                        path: 'instance.statisticalCodeIds[]',
                        fields: [
                          {
                            name: 'statisticalCodeId',
                            enabled: true,
                            path: 'instance.statisticalCodeIds[]',
                            value: `"${testData.statCode1.displayName}"`,
                          },
                        ],
                      },
                      {
                        order: 1,
                        path: 'instance.statisticalCodeIds[]',
                        fields: [
                          {
                            name: 'statisticalCodeId',
                            enabled: true,
                            path: 'instance.statisticalCodeIds[]',
                            value: `"${testData.statCode2.displayName}"`,
                          },
                        ],
                      },
                    ],
                    repeatableFieldAction: 'EXTEND_EXISTING',
                  },
                  {
                    name: 'natureOfContentTermIds',
                    enabled: true,
                    path: 'instance.natureOfContentTermIds[]',
                    value: '',
                    subfields: [
                      {
                        order: 0,
                        path: 'instance.natureOfContentTermIds[]',
                        fields: [
                          {
                            name: 'natureOfContentTermId',
                            enabled: true,
                            path: 'instance.natureOfContentTermIds[]',
                            value: `"${testData.nocTerm1.name}"`,
                          },
                        ],
                      },
                      {
                        order: 1,
                        path: 'instance.natureOfContentTermIds[]',
                        fields: [
                          {
                            name: 'natureOfContentTermId',
                            enabled: true,
                            path: 'instance.natureOfContentTermIds[]',
                            value: `"${testData.nocTerm2.name}"`,
                          },
                        ],
                      },
                    ],
                    repeatableFieldAction: 'EXTEND_EXISTING',
                  },
                ],
              },
            },
            addedRelations: [],
            deletedRelations: [],
          }).then(({ body }) => {
            NewActionProfile.createActionProfileViaApi(actionProfile, body.id).then(
              (actionProfileResponse) => {
                NewJobProfile.createJobProfileWithLinkedActionProfileViaApi(
                  jobProfile.profileName,
                  actionProfileResponse.body.id,
                );
              },
            );
          });
        })
        .then(() => {
          // Step 3: Import MARC bib to create an instance with the mapped fields
          DataImport.uploadFileViaApi('oneMarcBib.mrc', marcFileName, jobProfile.profileName).then(
            (response) => {
              testData.instanceId = response[0].instance.id;
            },
          );
        });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.user.userId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
    });

    it(
      'C17042 Check the handling of Statistical code and Nature of content fields when creating Instances (promin)',
      { tags: ['edgeCases', 'promin', 'C17042'] },
      () => {
        // Step 1: Navigate to imported instance
        InventorySearchAndFilter.searchInstanceByTitle(testData.instanceId);
        InventoryInstances.selectInstanceById(testData.instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 2: Verify both statistical codes from the mapping profile are set on the instance
        InstanceRecordView.verifyStatisticalCode(testData.statCode1.name);
        InstanceRecordView.verifyStatisticalCode(testData.statCode2.name);

        // Step 3: Verify both nature of content terms from the mapping profile are set
        InstanceRecordView.verifyNatureOfContent(including(testData.nocTerm1.name));
        InstanceRecordView.verifyNatureOfContent(including(testData.nocTerm2.name));
      },
    );
  });
});
