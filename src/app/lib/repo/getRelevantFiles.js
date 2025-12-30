


const IGNORED_FOLDERS = [
        "node_modules",
        "dist/",
        "build",
        "coverage",
        ".git",
        ".github",
        ".vscode",
    ];

    const WEB_PROJECT_INDICATORS=[
        "package.json",
        "next.config.js",
        "next.config.ts",
        "vite.config.ts",
        "webpack.config.js",
        "vite.config.js",
        
    ]
    
    const WEB_IMPORTANT_FILES=[
        "README.md",
        "package.json",
        ".env.example",
    ]
    
    
    const WEB_IMPORTANT_FOLDERS=[
        "src",
        "app",
        "pages",
        "public",
    ]
    
    function removeJunk(tree){
        return tree.filter(item=>{
            return ! IGNORED_FOLDERS.some(folder=>
                item.path.startsWith(folder+"/")
            )
        })
    }
    
    function isWebProject(tree){
        return tree.some(item=>WEB_PROJECT_INDICATORS.includes(item.path));
        return true;
    }

    function filterWebFiles(tree){
        if(isWebProject){
            return tree.filter(item=>{
                if(WEB_IMPORTANT_FILES.includes(item.path)){
                    return true;
                }
            })

            return WEB_IMPORTANT_FOLDERS.some(folder=>
                item.path.startsWith(folder+"/")
            )
        }
    }
    
    export async function getRelevant() {

        if(!Array.isArray(tree)) return[];

        const cleanedTree = removeJunk(tree);

        if(isWebProject(cleanedTree)){
            return filterWebFiles(cleanedTree)
        }

        return cleanedTree.filter(item=>item.path==="Readme.md")
}