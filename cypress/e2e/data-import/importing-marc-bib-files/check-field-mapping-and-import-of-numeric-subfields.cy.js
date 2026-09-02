import {
  EXISTING_RECORD_NAMES,
  INCOMING_RECORD_NAMES,
  INSTANCE_STATUS_TERM_NAMES,
  FOLIO_RECORD_TYPE,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
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
import InstanceStatusTypes from '../../../support/fragments/settings/inventory/instances/instanceStatusTypes/instanceStatusTypes';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {};
    const randomPostfix = getRandomPostfix();
    const marcFixtureFile = 'marcBibFileForC17043.mrc';
    const marcFileName = `C17043_autotestFile${randomPostfix}.mrc`;
    const expectedUri = 'http://purl.access.gpo.gov/GPO/LPS11418';
    const expectedMaterialsSpecified = 'TestTestTest';
    const expectedPublicNote = 'Holdings public note from FMP';

    let instanceApId;
    let holdingsApId;
    let locationName;

    const mappingProfiles = {
      instance: { name: `AT_C17043_InstanceMappingProfile_${randomPostfix}` },
      holdings: { name: `AT_C17043_HoldingsMappingProfile_${randomPostfix}` },
    };

    const actionProfiles = {
      instance: {
        name: `AT_C17043_InstanceActionProfile_${randomPostfix}`,
        action: 'CREATE',
        folioRecordType: 'INSTANCE',
      },
      holdings: {
        name: `AT_C17043_HoldingsActionProfile_${randomPostfix}`,
        action: 'CREATE',
        folioRecordType: 'HOLDINGS',
      },
    };

    const jobProfile = { name: `AT_C17043_JobProfile_${randomPostfix}` };

    before('Create test data via API', () => {
      cy.getAdminToken();

      cy.getLocations({
        limit: 1,
        query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
      }).then((res) => {
        locationName = res.name;
      });

      cy.then(() => {
        InstanceStatusTypes.getViaApi({
          query: `name=="${INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED}"`,
        }).then((statuses) => {
          testData.statusId = statuses[0].id;
        });
      })
        .then(() => {
          return FieldMappingProfiles.createMappingProfileViaApi({
            profile: {
              name: mappingProfiles.instance.name,
              incomingRecordType: INCOMING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
              existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
              mappingDetails: {
                name: FOLIO_RECORD_TYPE.INSTANCE.toLowerCase(),
                recordType: EXISTING_RECORD_NAMES.INSTANCE,
                mappingFields: [
                  {
                    name: 'catalogedDate',
                    enabled: true,
                    path: 'instance.catalogedDate',
                    value: '"###TODAY###"',
                    subfields: [],
                  },
                  {
                    name: 'statusId',
                    enabled: true,
                    path: 'instance.statusId',
                    value: `"${INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED}"`,
                    subfields: [],
                    acceptedValues: {
                      [testData.statusId]: INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED,
                    },
                  },
                ],
              },
            },
            addedRelations: [],
            deletedRelations: [],
          }).then(({ body }) => {
            return NewActionProfile.createActionProfileViaApi(
              actionProfiles.instance,
              body.id,
            ).then((apResponse) => {
              instanceApId = apResponse.body.id;
            });
          });
        })
        .then(() => {
          return FieldMappingProfiles.createMappingProfileViaApi({
            profile: {
              name: mappingProfiles.holdings.name,
              incomingRecordType: INCOMING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
              existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
              mappingDetails: {
                name: FOLIO_RECORD_TYPE.HOLDINGS.toLowerCase(),
                recordType: EXISTING_RECORD_NAMES.HOLDINGS,
                mappingFields: [
                  {
                    name: 'permanentLocationId',
                    enabled: true,
                    path: 'holdings.permanentLocationId',
                    value: `"${locationName}"`,
                    subfields: [],
                  },
                  {
                    name: 'electronicAccess',
                    enabled: true,
                    path: 'holdings.electronicAccess[]',
                    value: '',
                    repeatableFieldAction: 'EXTEND_EXISTING',
                    subfields: [
                      {
                        order: 0,
                        path: 'holdings.electronicAccess[]',
                        fields: [
                          {
                            name: 'uri',
                            enabled: true,
                            path: 'holdings.electronicAccess[].uri',
                            value: '856$u',
                          },
                          {
                            name: 'relationshipId',
                            enabled: false,
                            path: 'holdings.electronicAccess[].relationshipId',
                            value: '',
                            acceptedValues: {},
                          },
                          {
                            name: 'linkText',
                            enabled: false,
                            path: 'holdings.electronicAccess[].linkText',
                            value: '',
                          },
                          {
                            name: 'materialsSpecification',
                            enabled: true,
                            path: 'holdings.electronicAccess[].materialsSpecification',
                            value: '856$3',
                          },
                          {
                            name: 'publicNote',
                            enabled: true,
                            path: 'holdings.electronicAccess[].publicNote',
                            value: `"${expectedPublicNote}"`,
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
            addedRelations: [],
            deletedRelations: [],
          }).then(({ body }) => {
            return NewActionProfile.createActionProfileViaApi(
              actionProfiles.holdings,
              body.id,
            ).then((apResponse) => {
              holdingsApId = apResponse.body.id;
            });
          });
        })
        .then(() => {
          NewJobProfile.createJobProfileWithLinkedTwoActionProfilesViaApi(
            jobProfile,
            instanceApId,
            holdingsApId,
          );
        })
        .then(() => {
          DataImport.uploadFileViaApi(marcFixtureFile, marcFileName, jobProfile.name).then(
            (response) => {
              testData.instanceId = response[0].instance.id;
            },
          );
        })
        .then(() => {
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            testData.user = userProperties;
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.user?.userId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.name);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfiles.instance.name);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfiles.holdings.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfiles.instance.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfiles.holdings.name);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
    });

    it(
      'C17043 Check field mapping and import of numeric subfields (promin)',
      { tags: ['edgeCases', 'promin', 'C17043'] },
      () => {
        // Step 9: Navigate to the instance created by import
        InventorySearchAndFilter.searchInstanceByTitle(testData.instanceId);
        InventoryInstances.selectInstanceById(testData.instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 10: Open the holdings record and verify 856 $3 is mapped to Materials specified
        InstanceRecordView.openHoldingView();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.openAccordion('Electronic access');
        HoldingsRecordView.checkElectronicAccess(
          '-',
          expectedUri,
          '-',
          expectedMaterialsSpecified,
          expectedPublicNote,
        );
      },
    );
  });
});
