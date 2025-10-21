import { DEFAULT_JOB_PROFILE_NAMES, INSTANCE_SOURCE_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import NewRequest from '../../../../support/fragments/requests/newRequest';
import Requests from '../../../../support/fragments/requests/requests';
import SelectInstanceModal from '../../../../support/fragments/requests/selectInstanceModal';
import TitleLevelRequests from '../../../../support/fragments/settings/circulation/titleLevelRequests';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../../support/fragments/topMenu';
import UserEdit from '../../../../support/fragments/users/userEdit';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

function createFOLIOAndUploadMARCInstanceViaApi(titlesFOLIOInstance, marcFile, createdRecordsIds) {
  titlesFOLIOInstance.forEach((title) => {
    InventoryInstance.createInstanceViaApi({
      instanceTitle: title,
    }).then((instanceData) => {
      createdRecordsIds.push(instanceData.instanceData.instanceId);
    });
  });

  DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, marcFile.jobProfileToRun).then(
    (response) => {
      response.forEach((record) => {
        createdRecordsIds.push(record.instance.id);
      });
    },
  );
}

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const users = {};
    const createdRecordsFromCentralTenant = [];
    const createdRecordsFromUniversity = [];
    const createdRecordsFromCollege = [];
    const sharedFOLIOInstances = [
      `C410702 Test Shared facet Instance 1 Shared Folio ${getRandomPostfix()}`,
      `C410702 Test Shared facet Instance 2 Shared Folio ${getRandomPostfix()}`,
      `C410702 Test Shared facet Instance 3 Shared Folio ${getRandomPostfix()}`,
    ];
    const sharedMARCInstances = [
      'C410702 Test Shared facet Instance 6 Shared MARC',
      'C410702 Test Shared facet Instance 7 Shared MARC',
      'C410702 Test Shared facet Instance 8 Shared MARC',
      'C410702 Test Shared facet Instance 9 Shared MARC',
      'C410702 Test Shared facet Instance 10 Shared MARC',
      'C410702 Test Shared facet Instance 11 Shared MARC',
    ];
    const localFOLIOInstanceUniversity = [
      `C410702 Test Shared facet Instance 4 Local Member 1 Folio ${getRandomPostfix()}`,
    ];
    const localFOLIOInstaceCollege = [
      `C410702 Test Shared facet Instance 5 Local Member 2 Folio ${getRandomPostfix()}`,
    ];
    const localMARCInstancesUniversity = [
      'C410702 Test Shared facet Instance 12 Local MARC Member 1',
      'C410702 Test Shared facet Instance 13 Local MARC Member 1',
    ];
    const localMARCInstancesCollege = [
      'C410702 Test Shared facet Instance 14 Local MARC Member 2',
      'C410702 Test Shared facet Instance 15 Local MARC Member 2',
    ];
    const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
    const sharedAccordion = {
      name: 'Shared',
      yes: 'Yes',
      no: 'No',
    };
    const filterName = 'Source';
    const invalidSearchQuery = 'abracadabratesting';
    const marcFiles = [
      {
        marc: 'marcBibFileForC410702Shared.mrc',
        fileName: `C410702 Central testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      },
      {
        marc: 'marcBibFileForC410702LocalMember1.mrc',
        fileName: `C410702 Local testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      },
      {
        marc: 'marcBibFileForC410702LocalMember2.mrc',
        fileName: `C410702 Local testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      },
    ];

    before('Create user, data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiRequestsCreate.gui,
      ])
        .then((userProperties) => {
          users.userProperties = userProperties;

          cy.assignAffiliationToUser(Affiliations.University, users.userProperties.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(users.userProperties.userId, [
            Permissions.uiInventoryViewInstances.gui,
            Permissions.uiRequestsCreate.gui,
          ]);
          ServicePoints.createViaApi(servicePoint);
          UserEdit.addServicePointsViaApi(
            [servicePoint.id],
            users.userProperties.userId,
            servicePoint.id,
          );

          TitleLevelRequests.enableTLRViaApi();

          cy.resetTenant();
          createFOLIOAndUploadMARCInstanceViaApi(
            sharedFOLIOInstances,
            marcFiles[0],
            createdRecordsFromCentralTenant,
          );

          cy.setTenant(Affiliations.University);
          createFOLIOAndUploadMARCInstanceViaApi(
            localFOLIOInstanceUniversity,
            marcFiles[1],
            createdRecordsFromUniversity,
          );

          cy.setTenant(Affiliations.College);
          createFOLIOAndUploadMARCInstanceViaApi(
            localFOLIOInstaceCollege,
            marcFiles[2],
            createdRecordsFromCollege,
          );
        })
        .then(() => {
          cy.resetTenant();
          cy.login(users.userProperties.username, users.userProperties.password).then(() => {
            ConsortiumManager.switchActiveAffiliation(
              tenantNames.central,
              tenantNames.university,
              servicePoint.name,
            );
            ConsortiumManager.checkCurrentTenantInTopMenu(
              tenantNames.university,
              servicePoint.name,
            );
            cy.visit(TopMenu.requestsPath);
            Requests.waitLoading();
          });
        });
    });

    after('Delete users, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      createdRecordsFromCentralTenant.forEach((instanceId) => {
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });

      cy.setTenant(Affiliations.University);
      createdRecordsFromUniversity.forEach((instanceId) => {
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });
      UserEdit.changeServicePointPreferenceViaApi(users.userProperties.userId, [servicePoint.id]);
      ServicePoints.deleteViaApi(servicePoint.id);

      cy.setTenant(Affiliations.College);
      createdRecordsFromCollege.forEach((instanceId) => {
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });

      cy.resetTenant();
      Users.deleteViaApi(users.userProperties.userId);
    });

    it(
      'C877115 "Title look-up" plugin in "Requests" app: Use "Shared" facet in "Member" tenant (consortia) (spitfire)',
      { tags: ['criticalPathECS', 'spitfire', 'C877115'] },
      () => {
        // 1 Click on "Actions" button in second pane → Select "New" option
        NewRequest.openNewRequestPane();
        NewRequest.waitLoadingNewRequestPage();

        // 2 Check "Create title level request" checkbox →
        // Click on "Title look-up" link below the "Instance HRID or UUID" input field.
        NewRequest.enableTitleLevelRequest();
        NewRequest.openTitleLookUp();
        SelectInstanceModal.waitLoading();
        SelectInstanceModal.verifyAccordionExistance(sharedAccordion.name);

        // 3 Expand the "Shared" accordion button by clicking on it
        SelectInstanceModal.clickAccordionByName(sharedAccordion.name);
        SelectInstanceModal.verifyCheckboxInAccordion(
          sharedAccordion.name,
          sharedAccordion.yes,
          false,
        );
        SelectInstanceModal.verifyCheckboxInAccordion(
          sharedAccordion.name,
          sharedAccordion.no,
          false,
        );

        // 4 Execute search which will not return records:
        // - Input the search query which will not return records in the search box, ex.: "abracadabratesting"
        // - Click on the "Search" button
        SelectInstanceModal.fillInSearchField(invalidSearchQuery);
        SelectInstanceModal.clickSearchButton();
        SelectInstanceModal.checkEmptySearchResults(invalidSearchQuery);
        cy.wait(1000);

        // 5 Click "Reset all" button
        SelectInstanceModal.clickResetAllButton();

        // 6 Execute search which will return Instances created at preconditions:
        // -Input the following search query in the search box: "C410702 Test Shared facet"
        // -Click on the "Search" button.
        SelectInstanceModal.fillInSearchField('C410702 Test Shared facet');
        SelectInstanceModal.clickSearchButton();
        sharedFOLIOInstances.forEach((instance) => {
          SelectInstanceModal.verifyListResults(instance);
          SelectInstanceModal.verifyResultRowContentSharedIcon(instance, true);
        });
        localFOLIOInstanceUniversity.forEach((instance) => {
          SelectInstanceModal.verifyListResults(instance);
          SelectInstanceModal.verifyResultRowContentSharedIcon(instance, false);
        });
        sharedMARCInstances.forEach((instance) => {
          SelectInstanceModal.verifyListResults(instance);
          SelectInstanceModal.verifyResultRowContentSharedIcon(instance, true);
        });
        localMARCInstancesUniversity.forEach((instance) => {
          SelectInstanceModal.verifyListResults(instance);
          SelectInstanceModal.verifyResultRowContentSharedIcon(instance, false);
        });
        localFOLIOInstaceCollege.forEach((instance) => {
          SelectInstanceModal.verifyListResultsNotContains(instance);
        });
        localMARCInstancesCollege.forEach((instance) => {
          SelectInstanceModal.verifyListResultsNotContains(instance);
        });

        // 7 Check "Yes" checkbox in "Shared" accordion
        SelectInstanceModal.selectOptionInExpandedFilter(sharedAccordion.name, sharedAccordion.yes);
        sharedFOLIOInstances.forEach((instance) => {
          SelectInstanceModal.verifyListResults(instance);
          SelectInstanceModal.verifyResultRowContentSharedIcon(instance, true);
        });
        sharedMARCInstances.forEach((instance) => {
          SelectInstanceModal.verifyListResults(instance);
          SelectInstanceModal.verifyResultRowContentSharedIcon(instance, true);
        });
        localMARCInstancesUniversity.forEach((instance) => {
          SelectInstanceModal.verifyListResultsNotContains(instance);
        });
        localFOLIOInstaceCollege.forEach((instance) => {
          SelectInstanceModal.verifyListResultsNotContains(instance);
        });
        localFOLIOInstanceUniversity.forEach((instance) => {
          SelectInstanceModal.verifyListResultsNotContains(instance);
        });
        localMARCInstancesCollege.forEach((instance) => {
          SelectInstanceModal.verifyListResultsNotContains(instance);
        });

        // 8 Click on "Source" accordion header → Select "MARC" option in expanded accordion
        SelectInstanceModal.clickAccordionByName(filterName);
        SelectInstanceModal.selectOptionInExpandedFilter(filterName, INSTANCE_SOURCE_NAMES.MARC);
        sharedMARCInstances.forEach((instance) => {
          SelectInstanceModal.verifyListResults(instance);
          SelectInstanceModal.verifyResultRowContentSharedIcon(instance, true);
        });
        sharedFOLIOInstances.forEach((instance) => {
          SelectInstanceModal.verifyListResultsNotContains(instance);
        });
        localMARCInstancesUniversity.forEach((instance) => {
          SelectInstanceModal.verifyListResultsNotContains(instance);
        });
        localFOLIOInstaceCollege.forEach((instance) => {
          SelectInstanceModal.verifyListResultsNotContains(instance);
        });
        localFOLIOInstanceUniversity.forEach((instance) => {
          SelectInstanceModal.verifyListResultsNotContains(instance);
        });
        localMARCInstancesCollege.forEach((instance) => {
          SelectInstanceModal.verifyListResultsNotContains(instance);
        });

        // 9 Check "No" checkbox in "Shared" accordion
        SelectInstanceModal.selectOptionInExpandedFilter(sharedAccordion.name, sharedAccordion.no);
        sharedMARCInstances.forEach((instance) => {
          SelectInstanceModal.verifyListResults(instance);
          SelectInstanceModal.verifyResultRowContentSharedIcon(instance, true);
        });
        localMARCInstancesUniversity.forEach((instance) => {
          SelectInstanceModal.verifyListResults(instance);
          SelectInstanceModal.verifyResultRowContentSharedIcon(instance, false);
        });
        sharedFOLIOInstances.forEach((instance) => {
          SelectInstanceModal.verifyListResultsNotContains(instance);
        });
        localFOLIOInstaceCollege.forEach((instance) => {
          SelectInstanceModal.verifyListResultsNotContains(instance);
        });
        localFOLIOInstanceUniversity.forEach((instance) => {
          SelectInstanceModal.verifyListResultsNotContains(instance);
        });
        localMARCInstancesCollege.forEach((instance) => {
          SelectInstanceModal.verifyListResultsNotContains(instance);
        });

        // 10 Cancel applied "Source" facet by clicking on the "x" icon placed next to its header
        SelectInstanceModal.clearSourceFilter();
        sharedFOLIOInstances.forEach((instance) => {
          SelectInstanceModal.verifyListResults(instance);
          SelectInstanceModal.verifyResultRowContentSharedIcon(instance, true);
        });
        localFOLIOInstanceUniversity.forEach((instance) => {
          SelectInstanceModal.verifyListResults(instance);
          SelectInstanceModal.verifyResultRowContentSharedIcon(instance, false);
        });
        sharedMARCInstances.forEach((instance) => {
          SelectInstanceModal.verifyListResults(instance);
          SelectInstanceModal.verifyResultRowContentSharedIcon(instance, true);
        });
        localMARCInstancesUniversity.forEach((instance) => {
          SelectInstanceModal.verifyListResults(instance);
          SelectInstanceModal.verifyResultRowContentSharedIcon(instance, false);
        });
        localFOLIOInstaceCollege.forEach((instance) => {
          SelectInstanceModal.verifyListResultsNotContains(instance);
        });
        localMARCInstancesCollege.forEach((instance) => {
          SelectInstanceModal.verifyListResultsNotContains(instance);
        });
      },
    );
  });
});
