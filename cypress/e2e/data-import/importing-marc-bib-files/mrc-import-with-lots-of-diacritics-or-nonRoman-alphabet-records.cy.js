import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Parallelization } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import { INSTANCE_SOURCE_NAMES, JOB_STATUS_NAMES } from '../../../support/constants';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    const quantityOfItems = '15';
    const rowNumbers = [1, 4, 7, 14];
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const firstRecord = {
      title:
        'ha-Maʻaśim li-vene Erets-Yiśraʼel : halakhah ṿe-hisṭoryah be-Erets-Yiśraʼel ha-Bizanṭit / Hilel Nyuman.',
      firstAlternativeTitle:
        'Maʻasim of the people of the land of Israel : halakhah and history in Byzantine Palestine',
      secondAlternativeTitle: 'המעשים לבני ארץ־ישראל : הלכה והיסטוריה בארץ־ישראל הביזנטית',
      firstContributerName: 'Newman, Hillel',
      secondContributerName: 'ניומן, הלל',
      firstPublisher: 'Yad Yitsḥaḳ Ben-Tsevi',
      secondPublisher: 'יד יצחק בן-צבי',
      language: 'Hebrew',
    };
    const secondRecord = {
      title:
        '8-15 shi ji zhong xi bu Xizang de li shi, wen hua yu yi shu / Airuika Fute [and four others] zhu bian = Tibet in dialogue with its neighbours : history, culture and art of central and western Tibet, 8th to 15th century / Erika Forte [and four others] eds.',
      firstAlternativeTitle:
        'Tibet in dialogue with its neighbour : history, culture and art of central and western Tibet, 8th to 15th century',
      secondAlternativeTitle: '8-15世纪中西部西藏的历史, 文化与艺术',
      contributerName: 'Forte, Erika',
      firstPublisher: 'Zhongguo Zang xue chu ban she',
      secondPublisher: '中国藏学出版社',
      language: 'Chinese, English',
    };
    const thirdRecord = {
      title: '3-il man e ingnŭn Ilbonsa / Tʻakʻemissŭ Makʻotʻo chiŭm ; Ko Sŏn-yun omgim.',
      firstAlternativeTitle: 'Mikka de wakaru Nihonshi. Korean',
      secondAlternativeTitle: '3日でわかる日本史. Korean',
      firstContributerName: 'Takemitsu, Makoto, 1950-',
      secondContributerName: '武光誠, 1950-',
      firstPublisher: 'Sŏul Munhwasa',
      secondPublisher: '서울문화사',
      language: 'Korean',
    };
    const fourthRecord = {
      title:
        'Istorii︠a︡ ukraïnsʹkoho kooperatyvnoho rukhu : Iz pratsʹ Istorychno-filosofichnoï sektsiï HTSH.',
      firstAlternativeTitle: 'History of Ukrainian co-operative movement',
      secondAlternativeTitle:
        'Історія українського кооперативного руху : Із пратсь Історично-філософічної сектсії ГТШ.',
      contributerName: 'Vytanovych, Illi︠a︡',
      publisher: 'T-vo ukr. kooperatsiï',
      language: 'Ukrainian',
    };
    const nameMarcFileForCreate = `C6709 autotestFile.${getRandomPostfix()}.mrc`;

    beforeEach(() => {
      cy.loginAsAdmin();
      cy.getAdminToken();
    });

    it(
      'C6709 Import a file with lots of diacritics or non-Roman alphabet records (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet, Parallelization.nonParallel] },
      () => {
        // upload a marc file for creating of the new instance
        cy.visit(TopMenu.dataImportPath);
        DataImport.uploadFile('marcFileForC6709.mrc', nameMarcFileForCreate);
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(nameMarcFileForCreate);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(nameMarcFileForCreate);
        rowNumbers.forEach((rowNumber) => {
          FileDetails.checkStatusInColumn(
            FileDetails.status.created,
            FileDetails.columnNameInResultList.srsMarc,
            rowNumber,
          );
          FileDetails.checkStatusInColumn(
            FileDetails.status.created,
            FileDetails.columnNameInResultList.instance,
            rowNumber,
          );
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems);
        FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems);

        FileDetails.openInstanceInInventory('Created', rowNumbers[0]);
        InstanceRecordView.verifyInstanceSource(INSTANCE_SOURCE_NAMES.MARC);
        InventoryInstance.verifyInstanceTitle(firstRecord.title);
        InventoryInstance.verifyAlternativeTitle(0, 1, firstRecord.firstAlternativeTitle);
        InventoryInstance.verifyAlternativeTitle(1, 1, firstRecord.secondAlternativeTitle);
        InventoryInstance.verifyContributor(0, 1, firstRecord.firstContributerName);
        InventoryInstance.verifyContributor(1, 1, firstRecord.secondContributerName);
        InventoryInstance.verifyInstancePublisher(0, 0, firstRecord.firstPublisher);
        InventoryInstance.verifyInstancePublisher(1, 0, firstRecord.secondPublisher);
        InventoryInstance.verifyInstanceLanguage(firstRecord.language);

        cy.visit(TopMenu.dataImportPath);
        Logs.openFileDetails(nameMarcFileForCreate);
        FileDetails.openInstanceInInventory('Created', rowNumbers[1]);
        InstanceRecordView.verifyInstanceSource(INSTANCE_SOURCE_NAMES.MARC);
        InventoryInstance.verifyInstanceTitle(secondRecord.title);
        InventoryInstance.verifyAlternativeTitle(0, 1, secondRecord.firstAlternativeTitle);
        InventoryInstance.verifyAlternativeTitle(1, 1, secondRecord.secondAlternativeTitle);
        InventoryInstance.verifyContributor(0, 1, secondRecord.contributerName);
        InventoryInstance.verifyInstancePublisher(0, 0, secondRecord.firstPublisher);
        InventoryInstance.verifyInstancePublisher(1, 0, secondRecord.secondPublisher);
        InventoryInstance.verifyInstanceLanguage(secondRecord.language);

        cy.visit(TopMenu.dataImportPath);
        Logs.openFileDetails(nameMarcFileForCreate);
        FileDetails.openInstanceInInventory('Created', rowNumbers[2]);
        InstanceRecordView.verifyInstanceSource(INSTANCE_SOURCE_NAMES.MARC);
        InventoryInstance.verifyInstanceTitle(thirdRecord.title);
        InventoryInstance.verifyAlternativeTitle(0, 1, thirdRecord.firstAlternativeTitle);
        InventoryInstance.verifyAlternativeTitle(3, 1, thirdRecord.secondAlternativeTitle);
        InventoryInstance.verifyContributor(0, 1, thirdRecord.firstContributerName);
        InventoryInstance.verifyContributor(2, 1, thirdRecord.secondContributerName);
        InventoryInstance.verifyInstancePublisher(0, 0, thirdRecord.firstPublisher);
        InventoryInstance.verifyInstancePublisher(1, 0, thirdRecord.secondPublisher);
        InventoryInstance.verifyInstanceLanguage(thirdRecord.language);

        cy.visit(TopMenu.dataImportPath);
        Logs.openFileDetails(nameMarcFileForCreate);
        FileDetails.openInstanceInInventory('Created', rowNumbers[3]);
        InstanceRecordView.verifyInstanceSource(INSTANCE_SOURCE_NAMES.MARC);
        InventoryInstance.verifyInstanceTitle(fourthRecord.title);
        InventoryInstance.verifyAlternativeTitle(0, 1, fourthRecord.firstAlternativeTitle);
        InventoryInstance.verifyAlternativeTitle(1, 1, fourthRecord.secondAlternativeTitle);
        InventoryInstance.verifyContributor(0, 1, fourthRecord.contributerName);
        InventoryInstance.verifyInstancePublisher(0, 0, fourthRecord.publisher);
        InventoryInstance.verifyInstanceLanguage(fourthRecord.language);
      },
    );
  });
});
