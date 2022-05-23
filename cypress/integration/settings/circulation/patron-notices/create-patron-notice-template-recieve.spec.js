import NewPatronNoticeTemplate from '../../../../support/fragments/circulation/newPatronNoticeTemplate'
import SettingsMenu from '../../../../support/fragments/settingsMenu'
import TestType from '../../../../support/dictionary/testTypes'
import NewPatronNoticePolicies from '../../../../support/fragments/circulation/newPatronNoticePolicies'
describe('ui-circulation-settings: create and recieve patron notice', () => {
    const patronNoticeTemplate = { ...NewPatronNoticeTemplate.defaultUiPatronNoticeTemplate}
    const patronNoticePolicy ={ ...NewPatronNoticePolicies.defaultUiPatronNoticePolicies}

    beforeEach('login', () => {
        cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'))
        cy.visit(`${SettingsMenu.circulationPatronNoticeTemplatesPath}`)
    })

    it('C347621Check that user can receive notice with multiple items after finishing the session "Check out" by clicking the End Session button.', { tags: [TestType.smoke] }, () => {
        NewPatronNoticeTemplate.createTemplate(patronNoticeTemplate)
        NewPatronNoticeTemplate.checkTemplate(patronNoticeTemplate);
        patronNoticePolicy.template = patronNoticeTemplate.name
        NewPatronNoticePolicies.getTemplate(patronNoticePolicy, 'template')
        cy.log(`patron notice template name: ${patronNoticePolicy.template}`)

        cy.visit(`${SettingsMenu.circulationPatronNoticePoliciesPath}`)
        NewPatronNoticePolicies.createPolicy(patronNoticePolicy)
        NewPatronNoticePolicies.fillPolicyTemplate(patronNoticePolicy)

         // NewPatronNoticeTemplate.deleteTemplate()
        //  NewPatronNoticePolicies.deletePolicy()
    })
})