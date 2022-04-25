[![JSF and PrimeFaces IntelliSense](https://i.imgur.com/QkqSYdn.png "JSF and PrimeFaces IntelliSense")](https://github.com/leosj29/jsf-primefaces-intellisense)
# IntelliSense for JSF and PrimeFaces
A Visual Studio Code extension that provides PrimeFaces, Html Basic, Faces, JSTL, Composite and Facelets Templating components completion for the HTML, XHTML and JSF attribute based on the official Primefaces, JSTL and JSF taglib definitions.

![](https://i.imgur.com/r6DrYYu.gif)

## Features
* Gives you autocompletion for PrimeFaces components taglib (<p:).
* Gives you autocompletion for Html Basic components taglib (<h:).
* Gives you autocompletion for Faces Core components taglib (<f:).
* Gives you autocompletion for JSTL core components taglib (<c:).
* Gives you autocompletion for Composite components taglib (<cc:).
* Gives you autocompletion for Facelets Templating components taglib (<ui:).
* Automatic detection of xmlns (You must include the namespace mandatory).
    * PrimeFaces -> "http://primefaces.org/ui"
    * Html Basic -> "http://java.sun.com/jsf/html"
    * Faces Core -> "http://java.sun.com/jsf/core"    
    * JSTL Core -> ="http://xmlns.jcp.org/jsp/jstl/core"
    * Composite Components -> "http://java.sun.com/jsf/composite"
    * Facelets Templating -> "http://java.sun.com/jsf/facelets"
* You can customize the alias name.
    ```xml
        <!DOCTYPE html>
        <html lang="en" xmlns="http://www.w3.org/1999/xhtml" 
                xmlns:h="http://java.sun.com/jsf/html"
                xmlns:f="http://java.sun.com/jsf/core" 
                xmlns:cc="http://java.sun.com/jsf/composite" 
                xmlns:p="http://primefaces.org/ui">
                ......
        <!-- Or  -->	
        <!DOCTYPE html>
        <html lang="en" xmlns="http://www.w3.org/1999/xhtml" 
                xmlns:h="http://java.sun.com/jsf/html"
                xmlns:f="http://java.sun.com/jsf/core" 
                xmlns:composite="http://java.sun.com/jsf/composite" 
                xmlns:pf="http://primefaces.org/ui">
                ......
    ```
* Command to manually re-cache the class definitions used in the autocompletion;
* User Settings.

## Supported Language Modes
* HTML.
* XHTML.
* JSP.
* JSF.
* XML.

## Extended Support for Other Language Modes

It's possible to specify which language modes will have autocompletion. There are five settings for this feature:
* `jsf-primefaces-intellisense.languages` is for language modes based on HTML.


## Contributions
You can request new features and contribute to the extension development on its [repository on GitHub](https://github.com/leosj29/jsf-primefaces-intellisense/issues). Look for an issue you're interested in working on, comment on it to let me know you're working on it and submit your pull request! :D

## What's new in version 1.0.0 (Apr 25, 2022)

Check out the [changelog](https://github.com/leosj29/jsf-primefaces-intellisense/blob/master/CHANGELOG.md) for the current and previous updates.

## Usage
The extension will automatically display the completion options. In case the completion is not showing, you can run the command by pressing `Ctrl+Shift+P`(`Cmd+Shift+P` for Mac) and then typing "JSF and PrimeFaces Cache".

### More User Settings
The extension supports a few user settings, changes to these settings will be automatically recognized and the caching process will be re-executed.


![](https://i.imgur.com/blwBYrK.gif)
![](https://i.imgur.com/WK8Kr5r.gif)