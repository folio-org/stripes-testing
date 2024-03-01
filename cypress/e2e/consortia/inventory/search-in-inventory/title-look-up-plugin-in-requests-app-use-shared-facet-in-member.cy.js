import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
// import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
// import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
// import getRandomPostfix from '../../../../support/utils/stringTools';
// import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import UserEdit from '../../../../support/fragments/users/userEdit';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Requests from '../../../../support/fragments/requests/requests';
import NewRequest from '../../../../support/fragments/requests/newRequest';
// import TitleLevelRequests from '../../../../support/fragments/settings/circulation/titleLevelRequests';
import SelectInstanceModal from '../../../../support/fragments/requests/selectInstanceModal';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const users = {};
    // const createdRecordIDs = [];
    // const createdRecordsFromCentralTenant = [];
    // const createdRecordsFromUniversity = [];
    // const createdRecordsFromCollege = [];
    // const sharedFOLIOInstance = [
    //   'C410702 Test Shared facet Instance 1 Shared Folio',
    //   'C410702 Test Shared facet Instance 2 Shared Folio',
    //   'C410702 Test Shared facet Instance 3 Shared Folio',
    // ];
    // const localFOLIOInstanceUniversity =
    //   'C410702 Test Shared facet Instance 4 Local Member 1 Folio';
    // const localFOLIOInstaceCollege = 'C410702 Test Shared facet Instance 5 Local Member 2 Folio';
    // const localM1FOLIOInstance = {
    //   title: `${titlePrefix} Local FOLIO`,
    // };
    // const localM2FOLIOInstance = {
    //   title: `${titlePrefix} Local FOLIO Member 2`,
    // };
    const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();

    // const sharedMarcTitle = 'C410715-MSEARCH-588 Shared MARC';
    // const localM1MarcTitle = 'C410715-MSEARCH-588 Local MARC';
    // const localM2MarcTitle = 'C410715-MSEARCH-588 Local MARC Member 2';

    // const marcFiles = [
    //   {
    //     marc: 'marcBibFileForC410702Shared.mrc',
    //     fileName: `C410702 Central testMarcFile${getRandomPostfix()}.mrc`,
    //     jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    //     tenant: tenantNames.central,
    //   },
    //   {
    //     marc: 'marcBibFileForC410702LocalMember1.mrc',
    //     fileName: `C410702 Local testMarcFile${getRandomPostfix()}.mrc`,
    //     jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    //     tenant: tenantNames.university,
    //   },
    //   {
    //     marc: 'marcBibFileForC410702LocalMember2.mrc',
    //     fileName: `C410702 Local testMarcFile${getRandomPostfix()}.mrc`,
    //     jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    //     tenant: tenantNames.college,
    //   },
    // ];

    const Dropdowns = {
      SHARED: 'Shared',
      YES: 'Yes',
      NO: 'No',
    };

    before('Create user, data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiRequestsCreate.gui,
      ])
        .then((userProperties) => {
          users.userProperties = userProperties;
        })
        .then(() => {
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
          // TitleLevelRequests.enableTLRViaApi();
        });
      // .then(() => {
      //   cy.resetTenant();
      //   sharedFOLIOInstance.forEach((instance) => {
      //     InventoryInstance.createInstanceViaApi({
      //       instanceTitle: instance,
      //     }).then((instanceData) => {
      //       createdRecordsFromCentralTenant.push(instanceData.instanceData.instanceId);
      //     });
      //   });

      //   DataImport.uploadFileViaApi(
      //     marcFiles[0].marc,
      //     marcFiles[0].fileName,
      //     marcFiles[0].jobProfileToRun,
      //   ).then((response) => {
      //     response.entries.forEach((record) => {
      //       createdRecordsFromCentralTenant.push(record.relatedInstanceInfo.idList[0]);
      //     });
      //   });
      // })
      // .then(() => {
      //   cy.setTenant(Affiliations.University);
      //   InventoryInstance.createInstanceViaApi({
      //     instanceTitle: localFOLIOInstanceUniversity,
      //   }).then((instanceDataLocal) => {
      //     createdRecordsFromUniversity.push(instanceDataLocal.instanceData.instanceId);
      //   });

      //   DataImport.uploadFileViaApi(
      //     marcFiles[1].marc,
      //     marcFiles[1].fileName,
      //     marcFiles[1].jobProfileToRun,
      //   ).then((response) => {
      //     response.entries.forEach((record) => {
      //       createdRecordsFromUniversity.push(record.relatedInstanceInfo.idList[0]);
      //     });
      //   });

      //   cy.setTenant(Affiliations.College);
      //   InventoryInstance.createInstanceViaApi({
      //     instanceTitle: localFOLIOInstaceCollege,
      //   }).then((instanceDataLocal) => {
      //     createdRecordsFromCollege.push(instanceDataLocal.instanceData.instanceId);
      //   });

      //   DataImport.uploadFileViaApi(
      //     marcFiles[2].marc,
      //     marcFiles[2].fileName,
      //     marcFiles[2].jobProfileToRun,
      //   ).then((response) => {
      //     response.entries.forEach((record) => {
      //       createdRecordsFromCollege.push(record.relatedInstanceInfo.idList[0]);
      //     });
      //   });
      // })
      cy.log(servicePoint.name).then(() => {
        cy.login(users.userProperties.username, users.userProperties.password).then(() => {
          ConsortiumManager.switchActiveAffiliation(
            tenantNames.central,
            tenantNames.university,
            servicePoint.name,
          );
          ConsortiumManager.checkCurrentTenantInTopMenu(
            `${tenantNames.university} ${servicePoint.name}`,
          );
          cy.visit(TopMenu.requestsPath);
          Requests.waitLoading();
        });
      });
    });

    after('Delete users, data', () => {
      cy.getAdminToken();
      cy.resetTenant();
      //   cy.setTenant(Affiliations.University);
      //   ServicePoints.deleteViaApi(servicePoint.id);
      // cy.resetTenant();
      Users.deleteViaApi(users.userProperties.userId);
      // TitleLevelRequests.disableTLRViaApi();
      //   InventoryInstance.deleteInstanceViaApi(sharedFOLIOInstance.id);
      //   InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
      //   cy.setTenant(Affiliations.University);
      //   InventoryInstance.deleteInstanceViaApi(localM1FOLIOInstance.id);
      //   InventoryInstance.deleteInstanceViaApi(createdRecordIDs[1]);
      //   cy.setTenant(Affiliations.College);
      //   InventoryInstance.deleteInstanceViaApi(localM2FOLIOInstance.id);
      //   InventoryInstance.deleteInstanceViaApi(createdRecordIDs[2]);
    });

    it(
      'C410702 "Title look-up" plugin in "Requests" app: Use "Shared" facet in "Member" tenant (consortia) (spitfire)',
      { tags: ['criticalPathECS', 'spitfire'] },
      () => {
        // 1 Click on "Actions" button in second pane → Select "New" option
        NewRequest.openNewRequestPane();
        NewRequest.waitLoadingNewRequestPage();

        // 2 Check "Create title level request" checkbox →
        // Click on "Title look-up" link below the "Instance HRID or UUID" input field.
        NewRequest.enableTitleLevelRequest();
        NewRequest.openTitleLookUp();
        SelectInstanceModal.waitLoading();
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.SHARED);
      },
    );
  });
});
