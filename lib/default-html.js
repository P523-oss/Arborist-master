module.exports = function (opts) {
  return `
  <html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
  <head>
  <title>
  ${opts.host}</title>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
  <meta name="description" content="${opts.host} helps E-retailers capitalize on their exit traffic" />
  <meta name="keywords" content="ecommerce, advertising" />
  <meta name="Content-Language" content="en-US"/>
  <meta name="Coverage" content="Worldwide"/>
  <meta name="rating" content="General"/>
  <meta name="Author" content="${opts.host}"/>
  <link rel="stylesheet" href="https://unpkg.com/tachyons@4.10.0/css/tachyons.min.css"/>
  </head>

  <body>

  <article class="cf ph3 ph5-ns pv5">
    <header class="fn fl-ns w-30-ns pr4-ns">
      <h1 class="f2 lh-title fw9 mb3 mt0 pt3 bt bw2">
        ${opts.host}
      </h1>
      <h2 class="f3 mid-gray lh-title">
        If you believe you are seeing the page in error, please contact your Interlincx representative with the campaign url you are running.
      </h2>
    </header>
    <div class="fn fl-ns w-70-ns">
      <p class="f5 lh-copy measure mt0-ns">
        ${opts.host} is an Interlincx Media Corp. owned property used for real-time tracking by counting clicks of member advertisers and publishers. ${opts.host} is not an emailing service, a search engine, nor a web bot. ${opts.host} does not distribute spyware or malware. ${opts.host} does not collect any personally identifiable information from end users. We can't find you, even if we wanted to.
      </p>
      <p class="f5 lh-copy measure">
        While ${opts.host} is not an emailing service, sometimes some of the offers presented to end users are in the form of emails sent by Third Parties that use our online advertising technology. Our strict policy is to require that these Third Parties vigorously maintain CAN-SPAM compliance, as well as supporting guidelines to protect your privacy.
      </p>

      <p class="f5 lh-copy measure">
        <a href="http://www.interlincx.com/terms-of-service/">Interlincx Terms and Conditions</a>
        <br/>
        <a href="http://www.interlincx.com/privacy-policy/">Interlincx Privacy Policy</a>
        <br/>
        <a href="http://www.fcc.gov/guides/spam-unwanted-text-messages-and-email">CAN-SPAM</a>
      </p>

      <h2 class="f3 mid-gray lh-title">
        About Interlincx Media Corp.
      </h2>

      <p class="f5 lh-copy measure">
        For ${new Date().getYear() - new Date('2001-01-01').getYear()} years Interlincx has been connecting online consumers with many of the internet's leading advertisers. Today, our proprietary technology identifies consumer-shopping intent, values it, and ultimately delivers the right customers, to the right advertiser, at the right time.
      </p>

      <p class="f5 lh-copy measure">
        For more information please visit <a href="http://www.interlincx.com">www.interlincx.com</a>.
      </p>

    </div>
  </article>

  </body>
  </html>
  `
}
