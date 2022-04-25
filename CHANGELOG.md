### 1.0.1(Apr 25, 2022)
* Add support for all JavaServer Faces 2.2 Facelets Tag Library
    *  h tags ([Html Basic](https://docs.oracle.com/javaee/7/javaserver-faces-2-2/vdldocs-facelets/h/tld-frame.html))
    *  f tags ([Faces Core](https://docs.oracle.com/javaee/7/javaserver-faces-2-2/vdldocs-facelets/f/tld-frame.html))
    *  c tags ([JSTL core](https://docs.oracle.com/javaee/7/javaserver-faces-2-2/vdldocs-facelets/c/tld-frame.html))
    *  cc tags ([Composite Components](https://docs.oracle.com/javaee/7/javaserver-faces-2-2/vdldocs-facelets/cc/tld-frame.html))
    *  ui tags ([Facelets Templating](https://docs.oracle.com/javaee/7/javaserver-faces-2-2/vdldocs-facelets/ui/tld-frame.html))

* Automatic detection of xmlns and aliases (You can customize the alias)
    * xmlns:p="http://primefaces.org/ui"
    * xmlns:f="http://java.sun.com/jsf/core"
    * xmlns:h="http://java.sun.com/jsf/html"
    * xmlns:c="http://xmlns.jcp.org/jsp/jstl/core"
    * xmlns:cc="http://java.sun.com/jsf/composite"
    * xmlns:ui="http://java.sun.com/jsf/facelets"