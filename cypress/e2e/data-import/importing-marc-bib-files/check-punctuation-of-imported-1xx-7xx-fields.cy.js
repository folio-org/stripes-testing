import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {
      marcFile: {
        marc: 'marcBibFileForC398003.mrc',
        fileName: `testMarcFileC398003.${randomFourDigitNumber()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      },
      contributors: [
        { name: 'Kani, John', controlledType: 'Conceptor' },
        { name: 'Buena Vista Corporate Entertainment (Firm)', controlledType: 'Film distributor' },
        { name: 'Conference of Medium Superheroes', controlledType: 'Associated name' },
        { name: 'Cole, Joe Robert', controlledType: 'Screenwriter' },
        { name: 'Feige, Kevin', controlledType: 'Film producer' },
        { name: 'Brown, Sterling K.', controlledType: 'Interviewer' },
        { name: 'Freeman, Martin, 1971-', controlledType: 'Actor' },
        { name: 'Plato' },
        { name: 'Ward, Humphrey, Mrs' },
        { name: 'Seuss, Dr' },
        { name: 'Moore, John K.,   Jr.' },
        { name: 'Boseman, Chadwick', controlledType: 'Actor' },
        { name: 'Jordan, Michael B. (Michael Bakari), 1987-', controlledType: 'Actor' },
        { name: 'Coogler, Ryan, 1986-', controlledType: 'Film director' },
        { name: "Nyong'o, Lupita", controlledType: 'Actor' },
        { name: 'Gurira, Danai', controlledType: 'Actor' },
        { name: 'Kaluuya, Daniel, 1989-', controlledType: 'Actor' },
        { name: 'Wright, Letitia, 1993-', controlledType: 'Author of introduction, etc.' },
        { name: 'Duke, Winston, 1986-', controlledType: 'Actor' },
        { name: 'Kasumba, Florence, 1976-', controlledType: 'Actor' },
        { name: 'Kani, John', controlledType: 'Actor' },
        { name: 'Bassett, Angela', controlledType: 'Actor' },
        { name: 'Whitaker, Forest', controlledType: 'Actor' },
        { name: 'Serkis, Andy', controlledType: 'Actor' },
        { name: 'Ge\u0300oransson, Ludwig, 1984-', controlledType: 'Composer' },
        { name: 'Lamar, Kendrick, 1987-', freeTextType: '(composer expression)' },
        { name: 'Morrison, Rachel (Cinematographer)', freeTextType: 'director of photography.' },
        { name: 'Berman, Debbie, 1978-', controlledType: 'Editor of moving image work' },
        { name: 'Shawver, Michael P.', controlledType: 'Editor of moving image work' },
        { name: 'Carter, Ruthe', controlledType: 'Costume designer' },
        { name: 'Lee, Stan, 1922-2018' },
        { name: 'Kirby, Jack' },
        { name: 'Marvel Studios', controlledType: 'Production company' },
        { name: 'Walt Disney Pictures', controlledType: 'Production company' },
        { name: 'Buena Vista Home Entertainment (Firm)', controlledType: 'Film distributor' },
        { name: 'Conference of Greater Superheroes', controlledType: 'Associated name' },
        { name: 'Conference of Lesser Superheroes', freeTextType: 'associatedname.' },
      ],
    };

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
      'C398003 Check the punctuation of the imported file for 1xx7xx fields (promin)',
      { tags: ['extendedPath', 'promin', 'C398003'] },
      () => {
        // Steps 1-4: File imported via API; navigate to instance in Inventory
        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 5: Verify Contributor accordion — name (col 1), controlled type (col 2), free text type (col 3)
        testData.contributors.forEach(({ name, controlledType, freeTextType }, index) => {
          InventoryInstance.verifyContributor(index, 1, name);
          if (controlledType) {
            InventoryInstance.verifyContributor(index, 2, controlledType);
          }
          if (freeTextType) {
            InventoryInstance.verifyContributor(index, 3, freeTextType);
          }
        });
      },
    );
  });
});
