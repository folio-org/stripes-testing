import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {
      marcFile: {
        marc: 'marcBibFileForC380724.mrc',
        fileName: `testMarcFileC380724.${randomFourDigitNumber()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      },
      record1Classifications: [
        { classificationIdentifierType: 'LC', classification: 'Z3807.M24 G38 0724' },
        { classificationIdentifierType: 'LC', classification: 'TA3807.C24' },
        { classificationIdentifierType: 'NLM', classification: 'W1 NE3807 v.24' },
        { classificationIdentifierType: 'NLM', classification: 'QU 38 S724' },
        { classificationIdentifierType: 'Dewey', classification: '380.724 HEA' },
        { classificationIdentifierType: 'Dewey', classification: '380.7240' },
        { classificationIdentifierType: 'GDC', classification: 'A 3.8/0:724' },
        { classificationIdentifierType: 'GDC', classification: 'A 3.8/7:240' },
        { classificationIdentifierType: 'GDC', classification: 'A 3.8:' },
        { classificationIdentifierType: 'LC', classification: 'TA3807.C2' },
        { classificationIdentifierType: 'LC', classification: 'Z3807.M24 G07 2438' },
      ],
      record2Classifications: [
        { classificationIdentifierType: 'LC', classification: 'B3807.A24 P3807 2000a' },
        { classificationIdentifierType: 'LC', classification: 'B3807.A24 P3807 2000b' },
        { classificationIdentifierType: 'NLM', classification: 'W1 ME3807 v.24 3807' },
        { classificationIdentifierType: 'NLM', classification: 'QH 38.07 C724 3807' },
        { classificationIdentifierType: 'UDC', classification: '380.724 B07' },
        { classificationIdentifierType: 'UDC', classification: '307.248 B38' },
        { classificationIdentifierType: 'Dewey', classification: '380.724 HEA' },
        { classificationIdentifierType: 'Dewey', classification: '307.248 HEA' },
        { classificationIdentifierType: 'GDC', classification: 'D 38.07:M 24' },
        { classificationIdentifierType: 'GDC', classification: 'Y 3.AT 7:24 M 38/' },
        { classificationIdentifierType: 'LC', classification: 'B3807.A24 P3807 2000c' },
        { classificationIdentifierType: 'LC', classification: 'B3807.A24 P3807 2000d' },
      ],
    };

    let instanceId1;
    let instanceId2;
    let user;

    before('Create user and import test data', () => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi(
        testData.marcFile.marc,
        testData.marcFile.fileName,
        testData.marcFile.jobProfileToRun,
      ).then((response) => {
        instanceId1 = response[0].instance.id;
        instanceId2 = response[1].instance.id;
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(instanceId1);
      InventoryInstance.deleteInstanceViaApi(instanceId2);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C380724 Check the default mapping of Classification from the MARC record to the Inventory Instance Classification fields: Case 2 (promin)',
      { tags: ['extendedPath', 'promin', 'C380724'] },
      () => {
        // Steps 1-4: Import done via API; open first record
        InventoryInstances.searchByTitle(instanceId1);
        InventoryInstances.selectInstanceById(instanceId1);
        InstanceRecordView.waitLoading();

        // Steps 5-9: Verify record 1 classifications (050, 060, 082, 086, 090 with repeatable subfields)
        testData.record1Classifications.forEach(
          ({ classificationIdentifierType, classification }) => {
            InstanceRecordView.verifyClassification(classificationIdentifierType, classification);
          },
        );

        // Steps 10-16: Open second record; verify classifications (repeatable MARC fields)
        InventoryInstances.searchByTitle(instanceId2);
        InventoryInstances.selectInstanceById(instanceId2);
        InstanceRecordView.waitLoading();
        testData.record2Classifications.forEach(
          ({ classificationIdentifierType, classification }) => {
            InstanceRecordView.verifyClassification(classificationIdentifierType, classification);
          },
        );
      },
    );
  });
});
