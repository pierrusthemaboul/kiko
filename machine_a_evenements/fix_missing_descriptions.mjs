
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

// Config
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const geminiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseKey || !geminiKey) {
    console.error("Missing credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(geminiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const eventsToFix = [
    { "id": "01bde4a3-d93b-4964-9941-4781afc96d56", "date": "1448-01-01", "titre": "Fondation de l'Université de Bordeaux" },
    { "id": "6c416632-8000-4afc-af7b-35d2b0631ee6", "date": "1451-01-01", "titre": "Fin de la Guerre de Cent Ans - Bataille de Castillon" },
    { "id": "a73997d7-a58a-46c9-aef9-a62b0533c462", "date": "1454-01-01", "titre": "Prise de Constantinople par les Ottomans" },
    { "id": "2de5f949-467b-4572-a6d2-d36e45a9a5f9", "date": "1457-01-01", "titre": "Réhabilitation posthume de Jeanne d'Arc" },
    { "id": "979c9402-6e79-4036-8566-8970b04d046f", "date": "1458-01-01", "titre": "Mort de Charles VII et avènement de Louis XI" },
    { "id": "afee26d9-67be-47d5-8b0f-ee00519fad5d", "date": "1462-01-01", "titre": "Réhabilitation de Jeanne d'Arc par le procès en nullité" },
    { "id": "66eaecc4-56cc-44ee-a5d7-d02651fed1c8", "date": "1463-01-01", "titre": "Traité de Bayonne - Réconciliation de Louis XI et Jean V d'Armagnac" },
    { "id": "48aeff24-a50e-437f-a5ac-01985a6cbe1c", "date": "1464-01-01", "titre": "Mort de Cosme de Médicis l'Ancien" },
    { "id": "092cb36d-6879-4bdc-b093-6b8cbc967445", "date": "1467-01-01", "titre": "Guerre du Bien public - Bataille de Montlhéry" },
    { "id": "c547bcff-74d3-4c63-82ae-0b1e70830718", "date": "1470-01-01", "titre": "Mariage de Charles le Téméraire et Marguerite d'York" },
    { "id": "7c8f5ff6-2497-4814-a46f-a398af448415", "date": "1474-01-01", "titre": "Traité de Londres - Alliance entre Louis XI et Édouard IV" },
    { "id": "fb24f5e3-2837-45e1-8040-f05083d24a7f", "date": "1476-01-01", "titre": "Bataille de Grandson" },
    { "id": "732966ad-54d5-400d-8a0c-18c1d33478f4", "date": "1479-01-01", "titre": "Traité d'Alcáçovas entre la France et l'Espagne" },
    { "id": "d461fa11-717d-4de8-a2dd-653a744694e0", "date": "1480-01-01", "titre": "Mort de René d'Anjou" },
    { "id": "cb86eb6a-d1cb-498e-8b5f-d5e140236ef3", "date": "1481-01-01", "titre": "Rattachement de la Provence à la France" },
    { "id": "941cc7fa-a9b0-4c9b-95cc-f78eba789e7b", "date": "1482-01-01", "titre": "Rattachement de la Provence à la France" },
    { "id": "cfebfa2a-e4bf-4318-b312-fba4bdf2889c", "date": "1483-01-01", "titre": "Mort de Louis XI et avènement de Charles VIII" },
    { "id": "ae82f032-130b-4ef9-8c4b-1092c2cc3829", "date": "1484-01-01", "titre": "États généraux de Tours" },
    { "id": "fe45c5ba-8c6e-46e7-8c36-350ac43a6fbf", "date": "1487-01-01", "titre": "Bataille de Saint-Aubin-du-Cormier" },
    { "id": "4b5c7ed5-5025-4592-a4f8-d9f9aadee093", "date": "1489-01-01", "titre": "Traité de Redon - Intervention anglaise en Bretagne" },
    { "id": "eaa6fc5e-5ec2-464d-b79b-74c76e3f5562", "date": "1490-01-01", "titre": "Mariage d'Anne de Bretagne avec Maximilien d'Autriche par procuration" },
    { "id": "8303f658-2339-4a38-bae8-2fbdb860740d", "date": "1493-01-01", "titre": "Retour de Christophe Colomb de son premier voyage en Amérique" },
    { "id": "c95d9378-23c7-4c00-9517-4409c4ac9175", "date": "1495-01-01", "titre": "Bataille de Fornoue" },
    { "id": "1879da59-9ccd-4f39-a6e2-fe45b35fef7c", "date": "1496-01-01", "titre": "Mariage de Jeanne de France et Louis d'Orléans" },
    { "id": "6d14b243-b17b-4e9e-a536-e1b738db9bfb", "date": "1497-01-01", "titre": "Voyage de Vasco de Gama vers les Indes" },
    { "id": "87aef68f-7bf1-4d06-b18f-651cdc5db504", "date": "1499-01-01", "titre": "Louis XII devient roi de France" },
    { "id": "bef2de3a-7e94-483e-a33d-ed148b7aa320", "date": "1501-01-01", "titre": "Mariage de César Borgia avec Charlotte d'Albret" },
    { "id": "24be0ddc-2b74-4d7c-a63a-103558bccb78", "date": "1507-01-01", "titre": "Publication de la Cosmographiae Introductio avec le nom America" },
    { "id": "7c232984-7f9c-4b58-98ff-ad9ca869c3f5", "date": "1510-01-01", "titre": "Création de la Ligue de Cambrai contre Venise" },
    { "id": "3b467573-ee58-4db2-b4b5-f672c95ca3cc", "date": "1512-01-01", "titre": "Bataille de Ravenne" },
    { "id": "ed6a2835-e041-45ed-989a-a2a7b9cdf0a7", "date": "1514-01-01", "titre": "Bataille de Marignan" },
    { "id": "81f59240-be5b-4cc1-bfa6-3a2c13a67f55", "date": "1518-01-01", "titre": "Début de la prédication de Luther et des 95 thèses" },
    { "id": "38706966-5a73-424e-a7b5-f0f764c3c6c7", "date": "1528-01-01", "titre": "Début de la guerre de la Ligue de Cognac" },
    { "id": "1f5c9984-2176-426a-a4fc-b8819299e118", "date": "1537-01-01", "titre": "Création du Collège de France par François Ier" },
    { "id": "1371f1ef-2237-4d1f-aa84-066791fea4a0", "date": "1538-01-01", "titre": "Trêve de Nice entre François Ier et Charles Quint" },
    { "id": "14f33d00-ce00-4969-a0b4-a991dd4d1491", "date": "1544-01-01", "titre": "Bataille de Cérisoles" },
    { "id": "a62a7996-0027-478d-9ede-73548effc130", "date": "1546-01-01", "titre": "Mort de Martin Luther" },
    { "id": "0d7b40f3-8a1a-4a53-bda0-dfcbc660571b", "date": "1548-01-01", "titre": "Mort de François Ier et avènement d'Henri II" },
    { "id": "ba1ffae3-399e-4d84-b529-dae2f2d732e9", "date": "1549-01-01", "titre": "Entrée solennelle d'Henri II à Paris" },
    { "id": "1fa4b6ff-1eec-4d88-a20f-2b3c39d399b3", "date": "1551-01-01", "titre": "Concile de Trente - Seconde période" },
    { "id": "77365226-dadc-437d-bb37-46044d23fe39", "date": "1554-01-01", "titre": "Mariage de Marie Tudor et Philippe II d'Espagne" },
    { "id": "fd438e23-827c-46e5-8eda-f66c505e8b06", "date": "1559-01-01", "titre": "Mort du roi Henri II lors d'un tournoi" },
    { "id": "b83867ef-cbc6-4f5d-8ba5-31cad13c48bf", "date": "1560-01-01", "titre": "Mort de François II et avènement de Charles IX" },
    { "id": "e731e159-62e0-4686-b33a-5f99cc0f2e51", "date": "1563-01-01", "titre": "Edit d'Amboise" },
    { "id": "0a83fcd7-0699-44a3-827c-544fd825c6c1", "date": "1567-01-01", "titre": "Surprise de Meaux" },
    { "id": "b5bb2271-ec57-4788-9fef-96c15ce94a4c", "date": "1568-01-01", "titre": "Bataille de Jarnac" },
    { "id": "cae1314b-0ee1-4840-a15a-7e589416890f", "date": "1570-01-01", "titre": "Bataille de Lépante" },
    { "id": "f7cfc8d7-ef3d-45bc-86cd-51919fbfc886", "date": "1573-01-01", "titre": "Siège de La Rochelle par le duc d'Anjou" },
    { "id": "faab3d6f-bd39-4a17-86cc-a5ec39acd463", "date": "1574-01-01", "titre": "Mort de Charles IX et avènement d'Henri III" },
    { "id": "cdcc283e-f337-4ef3-a5ce-04cbe2d2503a", "date": "1577-01-01", "titre": "Sixième guerre de Religion en France" },
    { "id": "40257aa4-3dd6-4c85-8ef4-fcea6dd3f27a", "date": "1579-01-01", "titre": "Union d'Utrecht et formation des Provinces-Unies" },
    { "id": "2df10cbb-4b5c-4263-a2e1-189fcfc12835", "date": "1580-01-01", "titre": "Union dynastique de l'Espagne et du Portugal" },
    { "id": "a3ea0ae6-f0c5-4727-944a-e4e33e1a9945", "date": "1583-01-01", "titre": "Première application du calendrier grégorien en France" },
    { "id": "726215e8-07eb-4a3b-a5ba-0b1f661a8cd5", "date": "1584-01-01", "titre": "Mort de François d'Anjou et crise de succession" },
    { "id": "78f23ae9-b9e3-405a-80af-def4b3950c2a", "date": "1589-01-01", "titre": "Assassinat d'Henri III par Jacques Clément" },
    { "id": "347f25e7-cb9d-4e78-9afe-c1dadacf378b", "date": "1591-01-01", "titre": "Siège de Rouen par Henri IV" },
    { "id": "17cb17b5-eef8-46ab-9f6b-6258b665ae95", "date": "1594-01-01", "titre": "Sacre d'Henri IV à Chartres" },
    { "id": "3a33c385-cd69-4296-9a8d-d8be63dd35b3", "date": "1595-01-01", "titre": "Henri IV se convertit au catholicisme" },
    { "id": "4a47bd70-5dd5-49e5-96e6-94e2271c0306", "date": "1596-01-01", "titre": "Édit de Folembray - Henri IV abjure le protestantisme" },
    { "id": "f1210295-76f1-42f3-9f50-a6231a01a594", "date": "1597-01-01", "titre": "Prise d'Amiens par les Espagnols" },
    { "id": "d1fa0c1d-3460-4a99-89b4-bcd4887bc42d", "date": "1599-01-01", "titre": "Édit de Fontainebleau - Retour des Jésuites en France" },
    { "id": "a0fbb24f-693a-4929-8ef3-3b5680259185", "date": "1601-01-01", "titre": "Mariage de Louis XIII avec Anne d'Autriche" },
    { "id": "3bd11ef2-18e4-4f54-8eb2-0917945471b2", "date": "1604-01-01", "titre": "Traité de Londres - Paix entre l'Angleterre et l'Espagne" },
    { "id": "4a40df30-da99-4379-a88d-8f0e82df14ff", "date": "1611-01-01", "titre": "Publication de la Bible du roi Jacques (King James Version)" },
    { "id": "e2d81317-4a13-445d-a63e-4cbf04ecfaa9", "date": "1612-01-01", "titre": "Assassinat de Concino Concini" },
    { "id": "d70e603d-42cc-423f-8e9c-9a05a7d99433", "date": "1614-01-01", "titre": "Convocation des États généraux de 1614" },
    { "id": "46ab65ba-57d8-4c9e-876b-7e12ee7db553", "date": "1616-01-01", "titre": "Condamnation de Galilée par l'Inquisition" },
    { "id": "97a6c9e2-8390-42af-b2a5-95be57b33f9e", "date": "1619-01-01", "titre": "Défenestration de Prague" },
    { "id": "91f92545-07be-457d-8ff5-40e266cacbd1", "date": "1621-01-01", "titre": "Siège de Montauban par Louis XIII" },
    { "id": "73c37c4b-030b-4e4b-b2ea-00829c4c681d", "date": "1622-01-01", "titre": "Siège de Montpellier par Louis XIII" },
    { "id": "1b83c653-6194-4d64-a195-c5ad1a700fb4", "date": "1623-01-01", "titre": "Nomination du cardinal de Richelieu au Conseil du roi" },
    { "id": "16c25ef8-0223-431e-acd4-1dcfbe3ad1c3", "date": "1625-01-01", "titre": "Mariage d'Henriette de France avec Charles Ier d'Angleterre" },
    { "id": "93f98d4f-4b7f-411c-affd-d4cbdf988e31", "date": "1626-01-01", "titre": "Édit de février interdisant les duels en France" },
    { "id": "06422f2d-f04f-4de3-b57f-25c4cf477822", "date": "1629-01-01", "titre": "Édit de grâce d'Alès - Fin des guerres de Religion" },
    { "id": "e15ec230-4a7a-42c1-a232-20614efd99c3", "date": "1630-01-01", "titre": "Journée des Dupes" },
    { "id": "13c0d77c-b9ed-4794-9989-a8a22033db5f", "date": "1632-01-01", "titre": "Mort de Gustave II Adolphe à la bataille de Lützen" },
    { "id": "548c6f47-9ae5-440d-8178-11cb43b3aad3", "date": "1633-01-01", "titre": "Procès de Galilée par l'Inquisition" },
    { "id": "ecd0383d-d247-4e28-91a8-4f059ed3c840", "date": "1634-01-01", "titre": "Fondation de l'Académie française par Richelieu" },
    { "id": "53ed8b91-4787-4856-8e97-561f2274885d", "date": "1639-01-01", "titre": "Naissance de Jean Racine" },
    { "id": "00cafd61-cc7c-4684-99d6-dd59a7b57351", "date": "1640-01-01", "titre": "Mort de Rubens" },
    { "id": "a8684edc-5403-4bad-b2f5-18265ce8ad20", "date": "1641-01-01", "titre": "Conspiration de Cinq-Mars contre Richelieu" },
    { "id": "67793742-915d-44b5-8081-357098943b95", "date": "1645-01-01", "titre": "Bataille de Nördlingen et victoire française" },
    { "id": "46f96531-a4d7-4bc7-b408-3eb103dc6fb8", "date": "1646-01-01", "description": "Mort de Louis XIII et début de la régence d'Anne d'Autriche" },
    { "id": "5acedf56-2102-4606-bfae-b1473290cb2c", "date": "1649-01-01", "titre": "Exécution du roi Charles Ier d'Angleterre" },
    { "id": "97da6aa2-beed-4d43-bd84-ccb88cecadc5", "date": "1650-01-01", "titre": "Bataille de Rethel" },
    { "id": "3a93e53f-bb22-4d04-9711-7f4068b2024d", "date": "1651-01-01", "titre": "Bataille de Beresteczko" },
    { "id": "91a0116f-23dd-42b1-8a96-c4dd2b34bc52", "date": "1652-01-01", "titre": "Bataille du Faubourg Saint-Antoine" },
    { "id": "0bb1caba-03d9-404b-9372-83372a7c95d3", "date": "1656-01-01", "titre": "Fondation de l'Hôpital général de Paris" },
    { "id": "0740005e-002a-4bb9-94bc-16654dfc020e", "date": "1658-01-01", "titre": "Bataille des Dunes et prise de Dunkerque" },
    { "id": "1420cd24-e93c-4020-814e-4845d7093a4b", "date": "1659-01-01", "titre": "Traité des Pyrénées entre la France et l'Espagne" },
    { "id": "75f17b3e-4f07-41af-87e7-538d269ccc84", "date": "1674-01-01", "titre": "Bataille de Seneffe" },
    { "id": "0d71581c-1631-443a-a385-54c84d5691d7", "date": "1678-01-01", "titre": "Traité de Nimègue" },
    { "id": "6b508a91-259d-4afe-af30-cd35529fe731", "date": "1691-01-01", "titre": "Bataille de Fleurus" },
    { "id": "335b3035-b959-4002-8b5c-75d7c312a9b6", "date": "1692-01-01", "titre": "Massacre de Glencoe" },
    { "id": "b40a0cdc-1517-4ff6-b695-ee3bacf263dd", "date": "1695-01-01", "titre": "Grande famine de 1693-1695" },
    { "id": "073a10c0-c6af-441f-9183-bcf23f04f591", "date": "1697-01-01", "titre": "Traité de Ryswick" },
    { "id": "f734dfcb-85c1-4e65-8414-323a44bffee1", "date": "1699-01-01", "titre": "Traité de Carlowitz" },
    { "id": "7ab255ac-8adf-4bde-9efd-e5835188076e", "date": "1700-01-01", "titre": "Mort de Charles II d'Espagne et testament en faveur de Philippe d'Anjou" },
    { "id": "248f7bb5-c274-443c-8dcf-34a5d2232fd0", "date": "1702-01-01", "titre": "Début de la guerre de Succession d'Espagne" },
    { "id": "dd0a9d21-e76b-4270-bf8d-3cb6db52b1e7", "date": "1703-01-01", "titre": "Fondation de Saint-Pétersbourg par Pierre le Grand" },
    { "id": "f57b18cb-51c3-401f-8468-a20712d47783", "date": "1704-01-01", "titre": "Bataille de Blenheim" },
    { "id": "14c948f0-8fad-4390-9b52-c94b7b6ae1d1", "date": "1705-01-01", "titre": "Bataille de Blenheim et défaites françaises dans la guerre de Succession d'Espagne" },
    { "id": "e17a0165-b9a9-4b12-9495-8f13b2dd587e", "date": "1706-01-01", "titre": "Bataille de Ramillies" },
    { "id": "3f477ac9-816c-4c09-8974-9032d68196d8", "date": "1708-01-01", "titre": "Bataille d'Audenarde" },
    { "id": "017d0982-d4ee-43d9-a742-96a8107f62d8", "date": "1711-01-01", "titre": "Bataille de Malplaquet" },
    { "id": "3714820c-9157-4666-9dd8-f761c39039a2", "date": "1712-01-01", "titre": "Congrès de paix d'Utrecht" },
    { "id": "d0f01cbf-b43d-4176-8340-fe35e0b6184d", "date": "1713-01-01", "titre": "Traité d'Utrecht" },
    { "id": "bf172837-80f9-4244-80b2-e053713b4cef", "date": "1714-01-01", "titre": "Traité de Rastatt" },
    { "id": "b4dd32e2-6994-4bd9-908b-1412e114ec90", "date": "1716-01-01", "titre": "Mort de Louis XIV et début de la Régence de Philippe d'Orléans" },
    { "id": "84f31c9f-dbbc-4d8f-85bc-52885c38797e", "date": "1718-01-01", "titre": "Mort de Charles XII de Suède" },
    { "id": "8d1091b4-a55c-4b62-8a0b-567f5943cce0", "date": "1719-01-01", "titre": "Création du système de Law et de la Banque générale" },
    { "id": "8232a031-e735-43c8-bc33-6b3c74c1e200", "date": "1722-01-01", "titre": "Sacre de Louis XV" },
    { "id": "f8c28198-d923-4955-866c-125fafa7fdfd", "date": "1723-01-01", "titre": "Mort du Régent Philippe d'Orléans" },
    { "id": "73f57692-1dc5-4299-9844-f728d9648b66", "date": "1724-01-01", "titre": "Mort de Louis XIV - Début du règne personnel de Louis XV" },
    { "id": "21ba26ed-f064-4564-8185-40576b2196b7", "date": "1726-01-01", "titre": "Exil de Voltaire en Angleterre après l'affaire Rohan-Chabot" },
    { "id": "0ae948b5-6017-4dce-94f4-cb7dcae66570", "date": "1728-01-01", "titre": "Traité de Séville entre l'Espagne, la France et l'Angleterre" },
    { "id": "eada84fc-7799-4ffa-abc1-441f6a5d1af8", "date": "1729-01-01", "titre": "Traité de Séville" },
    { "id": "4750fee7-af45-4fab-b901-5f7b4b06ebc2", "date": "1730-01-01", "titre": "Création de la Compagnie française des Indes orientales" },
    { "id": "bd59d241-d6cd-4036-97c9-52f489005b50", "date": "1731-01-01", "titre": "Traité de Vienne et reconnaissance de la Pragmatique Sanction" },
    { "id": "26029941-e7fa-4c0a-9bf2-8b18f19e2634", "date": "1732-01-01", "titre": "Lettres philosophiques de Voltaire" },
    { "id": "f29f11b4-4ae1-40ce-ab41-75f2a84c4575", "date": "1733-01-01", "titre": "Début de la guerre de Succession de Pologne" },
    { "id": "024894b1-8e4b-4164-8e26-0ab63b8d2aea", "date": "1734-01-01", "titre": "Début de la guerre de Succession de Pologne" },
    { "id": "119450a1-c7da-431a-a647-b60251bf8b0c", "date": "1736-01-01", "titre": "Mariage de Marie-Thérèse d'Autriche et François de Lorraine" },
    { "id": "7b96ddd4-03a0-40ad-a290-e2b4362a4615", "date": "1737-01-01", "titre": "Mort de la reine Marie Leszczyńska devient reine de France" },
    { "id": "34d924a4-468c-49fc-b3c4-6d5a9512ab33", "date": "1738-01-01", "titre": "Traité de Vienne mettant fin à la guerre de Succession de Pologne" },
    { "id": "500c4f2d-1a2a-46e2-b382-e81639d06049", "date": "1739-01-01", "titre": "Guerre de l'Oreille de Jenkins" },
    { "id": "595ca01c-34d1-4a17-b8e6-151d56193735", "date": "1744-01-01", "titre": "Bataille de Fontenoy" },
    { "id": "a1ddf26d-5d96-43d7-bb07-3ef70d37dcef", "date": "1747-01-01", "titre": "Bataille de Lauffeld" },
    { "id": "06c7f126-e7c3-4460-a447-12f4b19f5254", "date": "1752-01-01", "titre": "Adoption du calendrier grégorien en Grande-Bretagne et ses colonies" },
    { "id": "2ce3ab9e-ddef-469b-ae76-147f1c084021", "date": "1753-01-01", "titre": "Publication de l'Encyclopédie de Diderot et d'Alembert" },
    { "id": "b84d24e3-ff7c-4f00-8069-e6afb24ee0d1", "date": "1756-01-01", "titre": "Début de la Guerre de Sept Ans" },
    { "id": "ae998349-b824-454d-8834-8cc44442c9e4", "date": "1759-01-01", "titre": "Bataille des Plaines d'Abraham" },
    { "id": "3787a963-b2f9-471b-ba83-4f6e1528ac3c", "date": "1761-01-01", "titre": "Pacte de Famille entre la France et l'Espagne" },
    { "id": "dda170eb-fd0b-4b9b-bf7d-1362877775e7", "date": "1762-01-01", "titre": "Traité de Paris - Fin de la guerre de Sept Ans" },
    { "id": "8bbc6743-4779-4a96-b204-29e190a21ee4", "date": "1764-01-01", "titre": "Mort de Madame de Pompadour" },
    { "id": "32c7f781-5c46-49be-8f0f-db86e9a3f935", "date": "1765-01-01", "titre": "Vote du Stamp Act par le Parlement britannique" },
    { "id": "161e802d-005e-43d2-a0e4-e9512ae210f2", "date": "1766-01-01", "titre": "Mort de Stanislas Leszczynski et rattachement de la Lorraine à la France" },
    { "id": "e47f61c3-7440-44c9-91e6-7bd882b5046b", "date": "1767-01-01", "titre": "Édit de pacification de Compiègne - Dissolution du parlement de Bretagne" },
    { "id": "4513af9f-518f-4ea5-8872-0d9afd7ade07", "date": "1772-01-01", "titre": "Suppression de l'ordre des Jésuites en France" },
    { "id": "3d5325a2-d084-4cd4-b9a5-4f8ccf9f6c03", "date": "1774-01-01", "titre": "Mort de Louis XV et avènement de Louis XVI" },
    { "id": "f8ae4c03-0b57-407e-8b2d-e360cde278b0", "date": "1775-01-01", "titre": "Début de la Guerre d'Indépendance américaine" },
    { "id": "3d20c02f-c5c5-40cf-802e-7e7f0880fea0", "date": "1778-01-01", "titre": "Traité d'alliance franco-américaine" },
    { "id": "061d35fb-b223-4dc1-b983-d6bf4fcfb9d4", "date": "1780-01-01", "titre": "Abolition de la torture judiciaire en France" },
    { "id": "8f2d9e61-23a9-4b23-8ffc-5ce360678d3b", "date": "1784-01-01", "titre": "Mort de Denis Diderot" },
    { "id": "710cdea0-7574-4634-8bc4-25af77e172b2", "date": "1802-01-01", "titre": "Napoléon Bonaparte devient Consul à vie" },
    { "id": "a7ce4c29-e1b4-4a3a-a8c9-02b80018ae67", "date": "1809-01-01", "titre": "Bataille de Wagram" },
    { "id": "b19d06cd-2d17-4eef-9e62-86bdc3f2a697", "date": "1813-01-01", "titre": "Bataille de Leipzig (Bataille des Nations)" },
    { "id": "543e1a73-a9b4-49c6-90d5-f9c01cb6c655", "date": "1818-01-01", "titre": "Congrès d'Aix-la-Chapelle" },
    { "id": "a0e96571-47a8-47c0-b4a0-abd4d42d8ebe", "date": "1819-01-01", "titre": "Naissance de la reine Victoria" },
    { "id": "c3a6a089-91db-49fb-8ae6-08d20daad821", "date": "1821-01-01", "titre": "Mort de Napoléon Bonaparte à Sainte-Hélène" },
    { "id": "3566e5cd-0385-41e8-8cf4-681f89a6d83e", "date": "1823-01-01", "titre": "Intervention française en Espagne (Expédition d'Espagne)" },
    { "id": "052c4dbd-623b-4af5-961d-a476ccaa3f15", "date": "1826-01-01", "titre": "Invention de la photographie par Nicéphore Niépce" },
    { "id": "c5f2fc6a-4a6a-4cad-8448-3ec2aa72ff6a", "date": "1828-01-01", "titre": "Campagne de Russie de Napoléon" },
    { "id": "8fcb6009-9cef-451d-af96-6826a1e865a1", "date": "1834-01-01", "titre": "Révolte des canuts de Lyon" },
    { "id": "3e735668-37f4-40a5-a874-2ff807dcbabf", "date": "1836-01-01", "titre": "Tentative d'assassinat de Louis-Philippe par Louis Alibaud" },
    { "id": "5919ad05-48da-49af-b047-c4e81afb5c5f", "date": "1838-01-01", "titre": "Début de la Guerre des Boers en Afrique du Sud" },
    { "id": "e0af663b-9e26-4657-ba21-3d75aa2e370f", "date": "1841-01-01", "titre": "Assassinat de Mehemet Ali par Ibrahim Pacha" },
    { "id": "bb88ac0a-c994-49c6-b29f-c593bc5ebcc0", "date": "1843-01-01", "titre": "Début de la conquête de l'Algérie par Abd el-Kader" },
    { "id": "81b0eac7-4e45-4c26-8855-6ceb18bec534", "date": "1845-01-01", "titre": "Publication du Comte de Monte-Cristo d'Alexandre Dumas" },
    { "id": "b8f0e50d-2ab4-4d1c-a5f3-516775437a1d", "date": "1847-01-01", "titre": "Manifeste du Parti communiste de Marx et Engels" },
    { "id": "f204f532-dae2-4cd3-8fc8-e312357b1053", "date": "1852-01-01", "titre": "Coup d'État de Louis-Napoléon Bonaparte" },
    { "id": "ebe025e9-c27b-46d9-b559-2ece255b9516", "date": "1855-01-01", "titre": "Exposition universelle de Paris" },
    { "id": "7d03a3b1-e630-4d73-85a4-df9a0dc77a8d", "date": "1856-01-01", "titre": "Traité de Paris - Fin de la guerre de Crimée" },
    { "id": "bcef7286-8af8-4de4-861b-93524a58ed9c", "date": "1862-01-01", "titre": "Bataille d'Antietam pendant la Guerre de Sécession américaine" },
    { "id": "5ba871af-7ef9-4a1a-bdc5-fd3f893fd4d9", "date": "1864-01-01", "titre": "Fondation de la Première Internationale" },
    { "id": "eef775c1-e64d-46df-85a4-0ad54ff4adb5", "date": "1865-01-01", "titre": "Assassinat d'Abraham Lincoln" },
    { "id": "6a88e639-0033-4531-87cc-212656e69190", "date": "1866-01-01", "titre": "Bataille de Sadowa (Königgrätz)" },
    { "id": "706e05f9-4164-4fff-9888-9e3c8456ccaa", "date": "1872-01-01", "titre": "Élection de Thiers comme premier président de la République française" },
    { "id": "9203f03c-145e-4c0c-8714-876384c862c0", "date": "1873-01-01", "titre": "Début de la République des Ducs" },
    { "id": "17a0aedf-3b23-4cfa-928c-bc95c55395fb", "date": "1878-01-01", "titre": "Exposition universelle de Paris" },
    { "id": "6afdd86b-d70d-4c37-8a28-975b08ba7add", "date": "1882-01-01", "titre": "Loi Jules Ferry rendant l'école primaire obligatoire et laïque" },
    { "id": "cc2f84af-3385-42a2-b755-6fd4666718d4", "date": "1883-01-01", "titre": "Mort de Karl Marx" },
    { "id": "89645d96-cdf4-4e01-9fc3-400ac9a73371", "date": "1885-01-01", "titre": "Funérailles nationales de Victor Hugo" }
];

async function generateDescription(event) {
    const prompt = `Génère une description détaillée (2 à 3 phrases maximum, environ 200-300 caractères) en français pour l'événement historique suivant :
Titre : ${event.titre}
Date : ${event.date}

La description doit être factuelle, concise et adaptée à un jeu de culture générale.
JSON uniquement : { "description": "..." }`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{.*\}/s);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]).description;
        }
    } catch (e) {
        console.error(`Error generating for ${event.titre}:`, e.message);
    }
    return null;
}

async function run() {
    console.log(`🚀 Début de l'enrichissement de ${eventsToFix.length} événements...`);

    let success = 0;
    let fail = 0;

    for (let i = 0; i < eventsToFix.length; i++) {
        const event = eventsToFix[i];
        process.stdout.write(`[${i + 1}/${eventsToFix.length}] ${event.titre}... `);

        const description = await generateDescription(event);

        if (description) {
            const { error } = await supabase
                .from('evenements')
                .update({
                    description_detaillee: description,
                    updated_at: new Date().toISOString()
                })
                .eq('id', event.id);

            if (error) {
                console.log(`❌ Update error: ${error.message}`);
                fail++;
            } else {
                console.log(`✅`);
                success++;
            }
        } else {
            console.log(`❌ Gen error`);
            fail++;
        }

        // Petit délai pour éviter de saturer l'API
        await new Promise(r => setTimeout(r, 100));
    }

    console.log(`\n✨ Terminé ! Succès: ${success}, Échecs: ${fail}`);
}

run();
