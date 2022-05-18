import NewPatronNoticeTemplate from '../../../../support/fragments/circulation/newPatronNoticeTemplate'
import SettingsMenu from '../../../../support/fragments/settingsMenu'
import TestType from '../../../../support/dictionary/testTypes'
describe('ui-circulation-settings: create and recieve patron notice', () => {
    const patronNoticeTemplate = { ...NewPatronNoticeTemplate.defaultUiPatronNoticeTemplate}

    beforeEach('login', () => {
        cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'))
        cy.visit(`${SettingsMenu.circulationPatronNoticeTemplatesPath}`)
    })

    it('C347621Check that user can receive notice with multiple items after finishing the session "Check out" by clicking the End Session button.', { tags: [TestType.smoke] }, () => {
        NewPatronNoticeTemplate.createTemplate(patronNoticeTemplate)
        NewPatronNoticeTemplate.checkTemplate(patronNoticeTemplate);
        NewPatronNoticeTemplate.deleteTemplate()
    })
})