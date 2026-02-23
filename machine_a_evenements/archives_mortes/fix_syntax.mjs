import fs from 'fs';

const filePath = 'c:/Users/Pierre/kiko/machine_a_evenements/sevent3.mjs';
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

// On insère l'accolade de fermeture du try et le début du catch
// La ligne 2893 actuelle contient "isValid: false,"
// On doit insérer "} catch (error) {" au dessus de 2893

lines.splice(2892, 0, '    } catch (error) {');

fs.writeFileSync(filePath, lines.join('\n'));
console.log('✅ Synchronized catch block fixed.');
