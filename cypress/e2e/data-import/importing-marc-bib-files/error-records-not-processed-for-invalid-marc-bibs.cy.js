import { DevTeams, TestTypes, Permissions, Parallelization } from '../../../support/dictionary';
import getRandomPostfix from '../../../support/utils/stringTools';
import DataImport from '../../../support/fragments/data_import/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import Users from '../../../support/fragments/users/users';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import { JOB_STATUS_NAMES } from '../../../support/constants';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    // eslint-disable-next-line
    const error =
      '{"errors":[{"name":"io.vertx.core.json.DecodeException","message":"Failed to decode:Illegal unquoted character ((CTRL-CHAR, code 9)): has to be escaped using backslash to be included in name\\n at [Source: (String)\\"{\\"leader\\":\\"01621cas a2200445 a 4500\\",\\"fields\\":[{\\"001\\":\\"in00000012507\\"},{\\"003\\":\\"OCoLC\\"},{\\"008\\":\\"06d0504c20069999txufr pso     0   a0eng c\\"},{\\"015\\":{\\"subfields\\":[],\\"ind1\\":\\";\\",\\"ind2\\":\\"A\\"}},{\\"00\\\\u0009\\":{\\"subfields\\":[],\\"ind1\\":\\" \\",\\"ind2\\":\\" \\"}},{\\"0==\\":{\\"subfields\\":[],\\"ind1\\":\\"d\\",\\"ind2\\":\\"s\\"}},{\\"\\\\u0009\\\\A\\":{\\"subfields\\":[],\\"ind1\\":\\"5\\",\\"ind2\\":\\"8\\"}},{\\"022\\":{\\"subfields\\":[{\\"a\\":\\"1 931-7603\\"},{\\"l\\":\\"1931-7603\\"},{\\"2\\":\\"1\\"}],\\"ind1\\":\\"0\\",\\"ind2\\":\\" \\"}},{\\"035\\":{\\"subfields\\":[{\\"a\\":\\"(OCoLC)68188263\\"},{\\"z\\":\\"(OCoLC)1058285745\\"}],\\"ind1\\":\\"\\"[truncated 2505 chars]; line: 1, column: 192]"}]}';
    const nameMarcFileForImportCreate = `C350750autotestFile.${getRandomPostfix()}.mrc`;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';

    before('login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
    });

    it(
      'C350750 Error records not processed or saved for invalid MARC Bibs (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet, Parallelization.nonParallel] },
      () => {
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile('marcFileForC350750.mrc', nameMarcFileForImportCreate);
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(nameMarcFileForImportCreate);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS);
        Logs.openFileDetails(nameMarcFileForImportCreate);
        FileDetails.verifyTitle('No content', FileDetails.columnNameInResultList.title);
        FileDetails.checkStatusInColumn(
          FileDetails.status.noAction,
          FileDetails.columnNameInResultList.srsMarc,
        );
        FileDetails.checkStatusInColumn(
          FileDetails.status.error,
          FileDetails.columnNameInResultList.error,
        );
        FileDetails.verifyErrorMessage(error);
      },
    );
  });
});
