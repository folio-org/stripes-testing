import TopMenu from '../../../support/fragments/topMenu';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import FileManager from '../../../support/utils/fileManager';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('fse-data-export - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.dataExportPath,
      waiter: ExportFileHelper.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `TC195288 - verify that data-export module is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'data-export', 'TC195288'] },
    () => {
      ExportFileHelper.waitLoading();
    },
  );
});

describe('fse-data-export - UI (data manipulation)', () => {
  const fileName = `autoTestFileFse${getRandomPostfix()}.csv`;
  const numberOfInstances = 5;
  const instances = [...Array(numberOfInstances)].map(() => ({
    title: `TC195471_FseInstance_${getRandomPostfix()}`,
  }));
  let instanceTypeId;

  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getAdminToken();

    cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
      instanceTypeId = instanceTypeData[0].id;

      instances.forEach((instance) => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId,
            title: instance.title,
          },
        }).then((createdInstanceData) => {
          instance.uuid = createdInstanceData.instanceId;

          FileManager.appendFile(`cypress/fixtures/${fileName}`, `${instance.uuid}\n`);
        });
      });
    });

    cy.loginAsAdmin({
      path: TopMenu.dataExportPath,
      waiter: ExportFileHelper.waitLoading,
    });

    cy.allure().logCommandSteps();
  });

  it(
    `TC195471 - verify data-export job for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['nonProd', 'fse', 'ui', 'data-export', 'fse-user-journey', 'TC195471'] },
    () => {
      cy.wait(3000);
      ExportFileHelper.uploadFile(fileName);
      ExportFileHelper.exportWithDefaultJobProfile(fileName);
    },
  );

  after('delete test data', () => {
    instances.forEach((instance) => {
      InventoryInstance.deleteInstanceViaApi(instance.uuid);
    });
    FileManager.deleteFile(`cypress/fixtures/${fileName}`);
  });
});
