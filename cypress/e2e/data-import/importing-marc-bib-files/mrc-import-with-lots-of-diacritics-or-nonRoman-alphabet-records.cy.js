import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  INSTANCE_SOURCE_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    const quantityOfItems = '15';
    const rowNumbers = [1, 4, 7, 14];
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
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
    const nameMarcFileForCreate = `C6709 autotestFile${getRandomPostfix()}.mrc`;

    before('Create user and login', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.waitLoading();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C6709 Import a file with lots of diacritics or non-Roman alphabet records (folijet)',
      { tags: ['criticalPath', 'folijet', 'C6709'] },
      () => {
        // upload a marc file for creating of the new instance
        DataImport.verifyUploadState();
        DataImport.uploadFile('marcFileForC6709.mrc', nameMarcFileForCreate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(nameMarcFileForCreate);
        Logs.checkJobStatus(nameMarcFileForCreate, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(nameMarcFileForCreate);
        rowNumbers.forEach((rowNumber) => {
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.CREATED,
            FileDetails.columnNameInResultList.srsMarc,
            rowNumber,
          );
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.CREATED,
            FileDetails.columnNameInResultList.instance,
            rowNumber,
          );
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems);
        FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems);

        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED, rowNumbers[0]);
        InstanceRecordView.verifyInstanceSource(INSTANCE_SOURCE_NAMES.MARC);
        InventoryInstance.verifyInstanceTitle(firstRecord.title);
        InventoryInstance.verifyAlternativeTitle(0, 1, firstRecord.firstAlternativeTitle);
        InventoryInstance.verifyAlternativeTitle(1, 1, firstRecord.secondAlternativeTitle);
        InventoryInstance.verifyContributor(0, 1, firstRecord.firstContributerName);
        InventoryInstance.verifyContributor(1, 1, firstRecord.secondContributerName);
        InventoryInstance.verifyInstancePublisher(
          {
            publisher: firstRecord.firstPublisher,
          },
          0,
        );
        InventoryInstance.verifyInstancePublisher(
          {
            publisher: firstRecord.secondPublisher,
          },
          1,
        );
        InventoryInstance.verifyInstanceLanguage(firstRecord.language);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        Logs.openFileDetails(nameMarcFileForCreate);
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED, rowNumbers[1]);
        InstanceRecordView.verifyInstanceSource(INSTANCE_SOURCE_NAMES.MARC);
        InventoryInstance.verifyInstanceTitle(secondRecord.title);
        InventoryInstance.verifyAlternativeTitle(0, 1, secondRecord.firstAlternativeTitle);
        InventoryInstance.verifyAlternativeTitle(1, 1, secondRecord.secondAlternativeTitle);
        InventoryInstance.verifyContributor(0, 1, secondRecord.contributerName);
        InventoryInstance.verifyInstancePublisher(
          {
            publisher: secondRecord.firstPublisher,
          },
          0,
        );
        InventoryInstance.verifyInstancePublisher(
          {
            publisher: secondRecord.secondPublisher,
          },
          1,
        );
        InventoryInstance.verifyInstanceLanguage(secondRecord.language);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        Logs.openFileDetails(nameMarcFileForCreate);
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED, rowNumbers[2]);
        InstanceRecordView.verifyInstanceSource(INSTANCE_SOURCE_NAMES.MARC);
        InventoryInstance.verifyInstanceTitle(thirdRecord.title);
        InventoryInstance.verifyAlternativeTitle(0, 1, thirdRecord.firstAlternativeTitle);
        InventoryInstance.verifyAlternativeTitle(3, 1, thirdRecord.secondAlternativeTitle);
        InventoryInstance.verifyContributor(0, 1, thirdRecord.firstContributerName);
        InventoryInstance.verifyContributor(2, 1, thirdRecord.secondContributerName);
        InventoryInstance.verifyInstancePublisher(
          {
            publisher: thirdRecord.firstPublisher,
          },
          0,
        );
        InventoryInstance.verifyInstancePublisher(
          {
            publisher: thirdRecord.secondPublisher,
          },
          1,
        );
        InventoryInstance.verifyInstanceLanguage(thirdRecord.language);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        Logs.openFileDetails(nameMarcFileForCreate);
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED, rowNumbers[3]);
        InstanceRecordView.verifyInstanceSource(INSTANCE_SOURCE_NAMES.MARC);
        InventoryInstance.verifyInstanceTitle(fourthRecord.title);
        InventoryInstance.verifyAlternativeTitle(0, 1, fourthRecord.firstAlternativeTitle);
        InventoryInstance.verifyAlternativeTitle(1, 1, fourthRecord.secondAlternativeTitle);
        InventoryInstance.verifyContributor(0, 1, fourthRecord.contributerName);
        InventoryInstance.verifyInstancePublisher(
          {
            publisher: fourthRecord.publisher,
          },
          0,
        );
        InventoryInstance.verifyInstanceLanguage(fourthRecord.language);
      },
    );
  });
});
