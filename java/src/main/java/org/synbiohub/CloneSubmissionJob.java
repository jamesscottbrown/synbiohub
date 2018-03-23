package org.synbiohub;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.PrintStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;

import org.apache.commons.codec.digest.DigestUtils;
import org.sbolstandard.core2.*;
import org.synbiohub.frontend.SynBioHubException;
import org.synbiohub.frontend.SynBioHubFrontend;

import javax.xml.namespace.QName;

public class CloneSubmissionJob extends Job
{
	public String sbolFilename;
	public String databasePrefix;
	public String uriPrefix;
	public boolean requireComplete;
	public boolean requireCompliant;
	public boolean enforceBestPractices;
	public boolean typesInURI;
	public String version;
	public boolean keepGoing;
	public String topLevelURI;

	public String rootCollectionIdentity;
	public String originalCollectionDisplayId;
	public String originalCollectionVersion;
	public String newRootCollectionDisplayId;
	public String newRootCollectionVersion;
	public HashMap<String,String> webOfRegistries;
	public String shareLinkSalt;
	public String overwriteMerge;

	public void execute() throws SBOLValidationException, IOException, SBOLConversionException 
	{
		ByteArrayOutputStream logOutputStream = new ByteArrayOutputStream();
		ByteArrayOutputStream errorOutputStream = new ByteArrayOutputStream();
		
		SBOLDocument doc = SBOLValidate.validate(
				new PrintStream(logOutputStream),
				new PrintStream(errorOutputStream),
				sbolFilename,
				uriPrefix,
				requireComplete,
				requireCompliant, 
				enforceBestPractices,
				typesInURI,
				version,
				keepGoing,
				"",
				"",
				sbolFilename,
				topLevelURI,
				false,
				false,
				false,
				null,
				false,
				true,
				false);

		String log = new String(logOutputStream.toByteArray(), StandardCharsets.UTF_8);
		String errorLog = new String(errorOutputStream.toByteArray(), StandardCharsets.UTF_8);

		if(errorLog.startsWith("File is empty")) {
			doc = new SBOLDocument();
			errorLog = "";
		} else if(errorLog.length() > 0)
		{
			finish(new CloneSubmissionResult(this, false, "", log, errorLog));
			return;
		}

		doc = doc.changeURIPrefixVersion(uriPrefix, null, version);

		Collection originalRootCollection = doc.getCollection(originalCollectionDisplayId,version);
		doc.removeCollection(originalRootCollection);
		Collection rootCollection = (Collection)doc.createCopy(originalRootCollection, newRootCollectionDisplayId, version);
		
		if (!overwriteMerge.equals("0") && !overwriteMerge.equals("1")) {
			for(TopLevel topLevel : doc.getTopLevels())
			{	
				if(rootCollection!=null && topLevel.getIdentity().equals(rootCollection.getIdentity())) {
					topLevel.unsetDescription();
					topLevel.unsetName();
					topLevel.clearWasDerivedFroms();
					Annotation annotation = topLevel.getAnnotation(new QName("http://purl.org/dc/elements/1.1/", "creator", "dc"));
					topLevel.removeAnnotation(annotation);
					continue;
				}
				for (String registry : webOfRegistries.keySet()) {
					SynBioHubFrontend sbh = new SynBioHubFrontend(webOfRegistries.get(registry),registry);
					if (topLevel.getIdentity().toString().startsWith(registry)) {
						String topLevelUri = topLevel.getIdentity().toString();
						if (topLevelUri.startsWith(registry+"/user/")) {
							topLevelUri = topLevel.getIdentity().toString() + '/' + 
									DigestUtils.sha1Hex("synbiohub_" + DigestUtils.sha1Hex(topLevel.getIdentity().toString()) + shareLinkSalt) + 
									"/share";
						}
						SBOLDocument tlDoc;
						try {
							tlDoc = sbh.getSBOL(URI.create(topLevelUri));
						}
						catch (SynBioHubException e) {
							tlDoc = null;
						}
						if (tlDoc != null) {
							TopLevel tl = tlDoc.getTopLevel(topLevel.getIdentity());
							if (tl != null) {
								if (!topLevel.equals(tl)) {
									if (overwriteMerge.equals("3")) {
										try {
											sbh.removeSBOL(URI.create(topLevelUri));
										}
										catch (SynBioHubException e) {
											e.printStackTrace();
										}
									} else {
										errorLog = "Submission terminated.\nA submission with this id already exists, "
												+ " and it includes an object:\n" + topLevel.getIdentity() + "\nthat is already "
												+ " in this repository and has different content";
										finish(new CloneSubmissionResult(this, false, "", log, errorLog));
										return;
									}
								} else {
									doc.removeTopLevel(topLevel);
								}	
							}
						}
						break;
					}	
				}
			}
		}

		File resultFile = File.createTempFile("sbh_convert_validate", ".xml");

		SBOLWriter.write(doc, resultFile);

		finish(new CloneSubmissionResult(this, true, resultFile.getAbsolutePath(), log, errorLog));

	}
}
