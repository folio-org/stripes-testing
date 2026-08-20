import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import { or } from '../../../../interactors';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {
      marcFile: {
        marc: 'marcBibFileForC288432.mrc',
        fileName: `testMarcFileC288432.${randomFourDigitNumber()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      },
    };
    const subjectHeading =
      'C288432_subA--C288432_subC--C288432_subD--C288432_subG--C288432_subV--C288432_subX--C288432_subY--C288432_subZ';
    const subjectHeadingNoHyphens = subjectHeading.replace(/--/g, ' ');

    let instanceId;
    let user;

    before('Create user and import test data', () => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi(
        testData.marcFile.marc,
        testData.marcFile.fileName,
        testData.marcFile.jobProfileToRun,
      ).then((response) => {
        instanceId = response[0].instance.id;
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
      InventoryInstance.deleteInstanceViaApi(instanceId);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C288432 Check the default mapping of 647 Subject heading field from the MARC record to the Inventory Instance Subjects field (promin)',
      { tags: ['extendedPath', 'promin', 'C288432'] },
      () => {
        // Step 1-2: File imported via API in before hook using default job profile
        // Step 3-4: Search for imported instance by UUID; verify 647 subject (subfields a c d g v x y z)
        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InstanceRecordView.waitLoading();
        InventoryInstance.verifySubjectHeading(or(subjectHeading, subjectHeadingNoHyphens));
      },
    );
  });
});
