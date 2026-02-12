import { Permissions } from '../../support/dictionary';
import AgreementViewDetails from '../../support/fragments/agreements/agreementViewDetails';
import Agreements from '../../support/fragments/agreements/agreements';
import SearchAndFilterAgreements from '../../support/fragments/agreements/searchAndFilterAgreements';
import Courses from '../../support/fragments/courses/courses';
import CoursesView from '../../support/fragments/courses/coursesView';
import EHoldingsProviders from '../../support/fragments/eholdings/eHoldingsProviders';
import Licenses from '../../support/fragments/licenses/licenses';
import NewLicense from '../../support/fragments/licenses/newLicense';
import SearchAndFilterLicenses from '../../support/fragments/licenses/searchAndFilterLicenses';
import Notes from '../../support/fragments/notes/notes';
import NotesEholdings from '../../support/fragments/notes/notesEholdings';
import ExistingNoteView from '../../support/fragments/notes/existingNoteView';
import NoteTypes from '../../support/fragments/settings/notes/noteTypes';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../support/utils/stringTools';
import Requests from '../../support/fragments/requests/requests';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import { APPLICATION_NAMES } from '../../support/constants';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';

describe('Notes', () => {
  const testData = {
    notes: {},
  };

  before('Create test data', () => {
    cy.getAdminToken();

    ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' }).then((servicePoints) => {
      testData.servicePoint = servicePoints[0];

      cy.createTempUser([
        Permissions.uiNotesItemView.gui,
        Permissions.uiUsersView.gui,
        Permissions.uiAgreementsSearchAndView.gui,
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.licensesSearchAndView.gui,
        Permissions.uiRequestsView.gui,
        Permissions.coursesAll.gui,
      ])
        .then((userProperties) => {
          testData.user = userProperties;

          UserEdit.addServicePointViaApi(
            testData.servicePoint.id,
            testData.user.userId,
            testData.servicePoint.id,
          );
        })
        .then(() => {
          NoteTypes.getNoteTypesViaApi();
        })
        .then((noteTypes) => {
          testData.noteTypeId = noteTypes[0].id;

          cy.createTempUser().then((userWithNote) => {
            testData.userWithNote = userWithNote;

            const userNote = Notes.defaultNote(
              { typeId: testData.noteTypeId, agreementId: testData.userWithNote.userId },
              'users',
            );
            Notes.createViaApi(userNote).then((note) => {
              testData.notes.userNote = note;
            });
          });

          Agreements.createViaApi().then((agreement) => {
            testData.agreement = agreement;

            const agreementNote = Notes.defaultNote(
              { typeId: testData.noteTypeId, agreementId: testData.agreement.id },
              'agreements',
            );
            Notes.createViaApi(agreementNote).then((note) => {
              testData.notes.agreementNote = note;
            });
          });

          const DefaultLicense = {
            ...NewLicense.defaultLicense,
            status: 'Active',
          };
          NewLicense.createViaApi(DefaultLicense).then((license) => {
            testData.license = license;

            const licenseNote = Notes.defaultNote(
              { typeId: testData.noteTypeId, agreementId: testData.license.id },
              'licenses',
            );
            Notes.createViaApi(licenseNote).then((note) => {
              testData.notes.licenseNote = note;
            });
          });

          Courses.retrieveTermsViaAPI()
            .then((terms) => {
              testData.termId = terms[0].id;

              Courses.createListingViaAPI(testData.termId);
            })
            .then((courseListing) => {
              testData.courseListingId = courseListing.id;

              Courses.retrieveDepartmentsViaAPI();
            })
            .then((departments) => {
              testData.departmentId = departments.id;

              const defaultCourse = {
                name: `C380416 Course ${getRandomPostfix()}`,
                departmentId: testData.departmentId,
                courseListingId: testData.courseListingId,
              };

              Courses.createCourseViaAPI(defaultCourse);
            })
            .then((course) => {
              testData.course = course;

              const courseNote = Notes.defaultNote(
                { typeId: testData.noteTypeId, agreementId: testData.course.id },
                'courses',
              );
              Notes.createViaApi(courseNote);
            })
            .then((note) => {
              testData.notes.courseNote = note;
            });

          Requests.createRequestApi().then((request) => {
            testData.request = request.createdRequest;

            const requestNote = Notes.defaultNote(
              { typeId: testData.noteTypeId, agreementId: testData.request.id },
              'requests',
            );
            Notes.createViaApi(requestNote).then((note) => {
              testData.notes.requestNote = note;
            });
          });

          EHoldingsProviders.getProvidersViaApi().then((providers) => {
            testData.providerId = providers[0].id;

            const eholdingsNote = Notes.defaultNote(
              { typeId: testData.noteTypeId, agreementId: testData.providerId },
              'eholdings',
            );
            Notes.createViaApi(eholdingsNote).then((note) => {
              testData.notes.eholdingsNote = note;
            });
          });
        });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Users.deleteViaApi(testData.userWithNote.userId);
    Notes.deleteViaApi(testData.notes.userNote.id, true);
    Agreements.deleteViaApi(testData.agreement.id);
    Notes.deleteViaApi(testData.notes.agreementNote.id, true);
    cy.deleteLicenseById(testData.license.id);
    Notes.deleteViaApi(testData.notes.licenseNote.id, true);
    Courses.deleteCourseViaAPI(testData.course.id);
    Notes.deleteViaApi(testData.notes.courseNote.id, true);
    Requests.deleteRequestViaApi(testData.request.id);
    Notes.deleteViaApi(testData.notes.requestNote.id, true);
    Notes.deleteViaApi(testData.notes.eholdingsNote.id, true);
  });

  it(
    'C380416 "Actions" menu not shown if user only has "Notes: Can view a note" permission (spitfire)',
    { tags: ['smoke', 'spitfire', 'C380416'] },
    () => {
      cy.login(testData.user.username, testData.user.password, {
        path: '/users',
        waiter: UsersSearchPane.waitLoading,
      });

      UsersSearchPane.searchByKeywords(testData.userWithNote.username);
      UsersSearchPane.selectUserFromList(testData.userWithNote.username);
      UsersCard.waitLoading();
      UsersCard.expandNotesSection();
      UsersCard.verifyNoteInList(testData.notes.userNote.title);
      UsersCard.clickNoteInList(testData.notes.userNote.title);
      ExistingNoteView.verifyActionsButtonAbsent();

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.AGREEMENTS);
      Agreements.waitLoading();
      SearchAndFilterAgreements.search(testData.agreement.name);
      Agreements.selectRecord(testData.agreement.name);
      AgreementViewDetails.waitLoading();
      AgreementViewDetails.expandNotesSection();
      AgreementViewDetails.verifyNoteInList(testData.notes.agreementNote.title);
      AgreementViewDetails.clickNoteInList(testData.notes.agreementNote.title);
      ExistingNoteView.verifyActionsButtonAbsent();

      cy.visit(`/eholdings/providers/${testData.providerId}`);
      NotesEholdings.waitLoading();
      NotesEholdings.verifyNoteInList(testData.notes.eholdingsNote.title);
      NotesEholdings.openNoteView(testData.notes.eholdingsNote.title);
      NotesEholdings.waitNoteViewLoading();
      NotesEholdings.verifyActionButtonVisibilityWithViewPermission();

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.LICENSES);
      Licenses.waitLoading();
      SearchAndFilterLicenses.search(testData.license.name);
      Licenses.selectRecord(testData.license.name);
      NewLicense.expandNotesSection();
      NewLicense.verifyNoteInList(testData.notes.licenseNote.title);
      NewLicense.clickNoteInList(testData.notes.licenseNote.title);
      ExistingNoteView.verifyActionsButtonAbsent();

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.REQUESTS);
      Requests.waitLoading();
      Requests.findCreatedRequest(testData.request.item.barcode);
      Requests.selectTheFirstRequest();
      RequestDetail.waitLoading();
      RequestDetail.verifyNoteInList(testData.notes.requestNote.title);
      RequestDetail.clickNoteInList(testData.notes.requestNote.title);
      ExistingNoteView.verifyActionsButtonAbsent();

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.COURSES);
      Courses.waitLoading();
      Courses.openCourseWithExpectedName(testData.course.name);
      CoursesView.waitLoading();
      CoursesView.expandNotesSection();
      CoursesView.verifyNoteInList(testData.notes.courseNote.title);
      CoursesView.clickNoteInList(testData.notes.courseNote.title);
      ExistingNoteView.verifyActionsButtonAbsent();
    },
  );
});
