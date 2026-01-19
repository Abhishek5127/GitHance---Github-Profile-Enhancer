export function SelectImportantFiles({ReleventFiles}){
    return `
    You are an expert in guessing the most important files in a repositry

    SELECT THE TOP 5 MOST IMPORTANT AND FILES WHICH COULD DEFINE WORK OF THIS REPOSITRY BEST.

    #REPOSITRY FILES:
    ${ReleventFiles}



    ##REQUIRMENTS:

    Select only TOP 5 Files.
    Only send File names as they were Provided.
    Send file names as an object in Json Format.
    `
}