/*
Script creates entitlements file with the list of hosts, specified in config.xml.
File name is: ProjectName.entitlements
Location: ProjectName/

Script only generates content. File it self is included in the xcode project in another hook: xcodePreferences.js.
*/

var path = require('path');
var fs = require('fs');
var plist = require('plist');
var mkpath = require('mkpath');
var ConfigXmlHelper = require('../configXmlHelper.js');
var ASSOCIATED_DOMAINS = 'com.apple.developer.associated-domains';
var context;
var projectRoot;
var projectName;
var debugEntitlementsFilePath;
var releaseEntitlementsFilePath;

module.exports = {
  generateAssociatedDomainsEntitlements: generateEntitlements
};

// region Public API

/**
 * Generate entitlements file content.
 *
 * @param {Object} cordovaContext - cordova context object
 * @param {Object} pluginPreferences - plugin preferences from config.xml; already parsed
 */
function generateEntitlements(cordovaContext, pluginPreferences) {
  context = cordovaContext;

  var currentDebugEntitlements = getDebugEntitlementsFileContent();
  var currentReleaseEntitlements = getReleaseEntitlementsFileContent();
  var newDebugEntitlements = injectPreferences(currentDebugEntitlements, pluginPreferences);
  var newReleaseEntitlements = injectPreferences(currentReleaseEntitlements, pluginPreferences);

  saveContentToEntitlementsFile(newDebugEntitlements, newReleaseEntitlements);
}

// endregion

// region Work with entitlements file

/**
 * Save data to entitlements file.
 *
 * @param {Object} content - data to save; JSON object that will be transformed into xml
 */
function saveContentToEntitlementsFile(debugContent, releaseContent) {
  var debugPlistContent = plist.build(debugContent);
  var releasePlistContent = plist.build(releaseContent);
  var debugFilePath = pathToDebugEntitlementsFile();
  var releaseFilePath = pathToReleaseEntitlementsFile();

  // ensure that file exists
  mkpath.sync(path.dirname(debugFilePath));
  mkpath.sync(path.dirname(releaseFilePath));

  // save it's content
  fs.writeFileSync(debugFilePath, debugPlistContent, 'utf8');
  fs.writeFileSync(releaseFilePath, releasePlistContent, 'utf8');
}

/**
 * Read data from existing DEBUG entitlements file. If none exist - default value is returned
 *
 * @return {String} entitlements file content
 */
function getDebugEntitlementsFileContent() {
  var pathToFile = pathToDebugEntitlementsFile();
  var content;

  try {
    content = fs.readFileSync(pathToFile, 'utf8');
  } catch (err) {
    return defaultEntitlementsFile();
  }

  return plist.parse(content);
}

/**
 * Read data from existing RELEASE entitlements file. If none exist - default value is returned
 *
 * @return {String} entitlements file content
 */
function getReleaseEntitlementsFileContent() {
  var pathToFile = pathToReleaseEntitlementsFile();
  var content;

  try {
    content = fs.readFileSync(pathToFile, 'utf8');
  } catch (err) {
    return defaultEntitlementsFile();
  }

  return plist.parse(content);
}

/**
 * Get content for an empty entitlements file.
 *
 * @return {String} default entitlements file content
 */
function defaultEntitlementsFile() {
  return {};
}

/**
 * Inject list of hosts into entitlements file.
 *
 * @param {Object} currentEntitlements - entitlements where to inject preferences
 * @param {Object} pluginPreferences - list of hosts from config.xml
 * @return {Object} new entitlements content
 */
function injectPreferences(currentEntitlements, pluginPreferences) {
  var newEntitlements = currentEntitlements;
  var content = generateAssociatedDomainsContent(pluginPreferences);

  newEntitlements[ASSOCIATED_DOMAINS] = content;

  return newEntitlements;
}

/**
 * Generate content for associated-domains dictionary in the entitlements file.
 *
 * @param {Object} pluginPreferences - list of hosts from conig.xml
 * @return {Object} associated-domains dictionary content
 */
function generateAssociatedDomainsContent(pluginPreferences) {
  var domainsList = [];

  // generate list of host links
  pluginPreferences.hosts.forEach(function(host) {
    var link = domainsListEntryForHost(host);
    if (domainsList.indexOf(link) == -1) {
      domainsList.push(link);
    }
  });

  return domainsList;
}

/**
 * Generate domain record for the given host.
 *
 * @param {Object} host - host entry
 * @return {String} record
 */
function domainsListEntryForHost(host) {
  return 'applinks:' + host.name;
}

// endregion

// region Path helper methods

/**
 * Path to DEBUG entitlements file.
 *
 * @return {String} absolute path to entitlements file
 */
function pathToDebugEntitlementsFile() {
  if (debugEntitlementsFilePath === undefined) {
    debugEntitlementsFilePath = path.join(getProjectRoot(), 'platforms', 'ios', getProjectName(), 'Entitlements-Debug.plist');
  }

  return debugEntitlementsFilePath;
}

/**
 * Path to PRODUCTION entitlements file.
 *
 * @return {String} absolute path to entitlements file
 */
function pathToReleaseEntitlementsFile() {
  if (releaseEntitlementsFilePath === undefined) {
    releaseEntitlementsFilePath = path.join(getProjectRoot(), 'platforms', 'ios', getProjectName(), 'Entitlements-Release.plist');
  }

  return releaseEntitlementsFilePath;
}

/**
 * Projects root folder path.
 *
 * @return {String} absolute path to the projects root
 */
function getProjectRoot() {
  return context.opts.projectRoot;
}

/**
 * Name of the project from config.xml
 *
 * @return {String} project name
 */
function getProjectName() {
  if (projectName === undefined) {
    var configXmlHelper = new ConfigXmlHelper(context);
    projectName = configXmlHelper.getProjectName();
  }

  return projectName;
}

// endregion
